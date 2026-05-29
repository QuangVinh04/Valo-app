import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import { UserMapper } from '../mapper/user.mapper.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { CreateUserRequestDto, UpdateUserRequestDto } from '../types/user.type.js';
import AppError from '../utils/app-error.js';
import { hashString } from '../utils/auth.util.js';
import { generateTemporaryPassword } from '../utils/password.util.js';
import { EmailService } from './email.service.js';
import {
  buildPaginatedResult,
  type PaginationOptions
} from '../utils/pagination.util.js';

export class UserService {
  private readonly userRepo: UserRepository;
  private readonly groupRepo: GroupRepository;
  private readonly emailService: EmailService;

  constructor(userRepository: UserRepository, groupRepository: GroupRepository, emailService: EmailService) {
    this.userRepo = userRepository;
    this.groupRepo = groupRepository;
    this.emailService = emailService;
  }

  async getUsers(pagination: PaginationOptions) {
    const [users, totalItems] = await Promise.all([
      this.userRepo.findMany({
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.userRepo.count(),
    ]);

    return buildPaginatedResult(
      users.map(UserMapper.toUserResponseDto),
      totalItems,
      pagination
    );
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findByIdForAuth(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    return UserMapper.toUserResponseDto(user);
  }

  async createUser(payload: CreateUserRequestDto) {
    const email = payload.email.trim().toLowerCase();

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_IN_USE);
    }

    const groupIds = await this.getGroupIds(payload.groupIds);
    const temporaryPassword = generateTemporaryPassword();

    const user = await withTransaction(async (tx) => {
      const userRepo = new UserRepository(tx);

      const result = await userRepo.createUser({
        fullName: payload.fullName.trim(),
        email,
        password: await hashString(temporaryPassword),
        mustChangePassword: true,
        groupIds,
      });
      return result;
    });

    await this.emailService.sendTemporaryPasswordEmail({
      to: user.email,
      fullName: user.fullName,
      temporaryPassword,
    });

    return UserMapper.toUserResponseDto(user);
  }

  async updateUser(id: string, payload: UpdateUserRequestDto) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const groupIds = payload.groupIds
      ? await this.getGroupIds(payload.groupIds)
      : undefined;

    const updatedUser = await withTransaction(async (tx) => {
      const userRepo = new UserRepository(tx);

      const result = await userRepo.updateUser(id, {
        fullName: payload.fullName?.trim(),
        groupIds
      });

      return result;
    });

    return UserMapper.toUserResponseDto(updatedUser);
  }

  async deleteUser(id: string) {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    await this.userRepo.deleteUser(id);
  }

  private async getGroupIds(groupIds?: string[]) {
    if (!groupIds?.length) {
      const defaultGroup = await this.groupRepo.findByName('user');

      if (!defaultGroup) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      return [defaultGroup.id];
    }

    const ids = [...new Set(groupIds.map((id) => id.trim()))].filter(Boolean);

    const existingIds = await this.groupRepo.findExistingIdsByIds(ids);

    if (existingIds.length !== ids.length) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    return ids;
  }
}
export default UserService;
