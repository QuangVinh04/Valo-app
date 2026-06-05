import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import { UserMapper } from '../mapper/user.mapper.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { CreateUserRequestDto, UpdateUserRequestDto, UserProfileDto, UserSettingsDto } from '../types/user.type.js';
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

  /**
   * Lấy danh sách người dùng theo phân trang và chuyển dữ liệu sang DTO an toàn.
   */
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

  /**
   * Lấy thông tin một người dùng theo ID; báo lỗi nếu không tìm thấy.
   */
  async getUserById(id: string) {
    const user = await this.userRepo.findByIdForAuth(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    return UserMapper.toUserResponseDto(user);
  }

  /**
   * Tạo tài khoản mới, gán nhóm, sinh mật khẩu tạm thời và gửi email cho người dùng.
   */
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

  /**
   * Cập nhật thông tin quản trị của người dùng, bao gồm họ tên và danh sách nhóm.
   */
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

  /**
   * Cập nhật thiết lập cá nhân của người dùng hiện tại như giao diện và ngôn ngữ.
   */
  async updateSettings(userId: string, payload: UserSettingsDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const updatedUser = await this.userRepo.updateSettings(userId, {
      theme: payload.theme,
      language: payload.language
    });

    return UserMapper.toUserResponseDto(updatedUser).settings;
  }

  /**
   * Cập nhật hồ sơ cá nhân, chuyển chuỗi rỗng thành null cho các trường tùy chọn.
   */
  async updateProfile(userId: string, payload: UserProfileDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const updatedUser = await this.userRepo.updateProfile(userId, {
      ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber.trim() || null } : {}),
      ...(payload.address !== undefined ? { address: payload.address.trim() || null } : {})
    });

    return UserMapper.toUserResponseDto(updatedUser);
  }

  /**
   * Xóa người dùng sau khi xác nhận người dùng tồn tại.
   */
  async deleteUser(id: string) {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    await this.userRepo.deleteUser(id);
  }

  /**
   * Trả về danh sách groupId hợp lệ; nếu không truyền thì dùng nhóm mặc định "user".
   */
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
