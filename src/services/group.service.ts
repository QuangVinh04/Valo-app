import { GroupRepository } from '../repositories/group.repository.js';
import { GroupRequestDto, UpdateGroupRequestDto } from '../types/group.type.js';
import { withTransaction } from '../database/transaction.js';
import { GroupMapper } from '../mapper/group.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
  buildPaginatedResult,
  type PaginationOptions
} from '../utils/pagination.util.js';

export class GroupService {
  private readonly groupRepository: GroupRepository;
  private readonly userRepository: UserRepository;

  constructor(groupRepository: GroupRepository, userRepository: UserRepository) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
  }

  async getGroups(pagination: PaginationOptions) {
    const [groups, totalItems] = await Promise.all([
      this.groupRepository.findMany({
        skip: pagination.skip,
        take: pagination.limit
      }),
      this.groupRepository.count()
    ]);

    return buildPaginatedResult(
      groups.map((group) => GroupMapper.toGroupResponseDto(group)),
      totalItems,
      pagination
    );
  }

  async getGroupById(id: string) {
    const group = await this.groupRepository.findByIdWithPermissions(id);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    return GroupMapper.toGroupResponseDto(group);
  }

  async createGroup(payload: GroupRequestDto) {
    const name = payload.name.trim();
    const existingGroup = await this.groupRepository.findByName(name);
    if (existingGroup) {
      throw new AppError(ErrorCode.GROUP_NAME_ALREADY_IN_USE);
    }

    const result = await withTransaction(async (tx) => {
      const groupRepo = new GroupRepository(tx);

      return groupRepo.createGroup({
        name,
        description: payload.description?.trim(),
        permissionKeys: this.normalizePermissionKeys(payload.permissions)
      });
    });

    return GroupMapper.toGroupResponseDto(result);
  }

  async updateGroup(id: string, payload: UpdateGroupRequestDto) {
    const result = await withTransaction(async (tx) => {
      const groupRepo = new GroupRepository(tx);

      await groupRepo.updateGroup(id, {
        name: payload.name?.trim(),
        description: payload.description?.trim(),
      });

      if (payload.permissions !== undefined) {
        const permissionKeys = this.normalizePermissionKeys(payload.permissions);

        await groupRepo.deletePermissions(id);

        if (permissionKeys.length > 0) {
          await groupRepo.createPermissions(id, permissionKeys);
        }
      }

      const group = await groupRepo.findByIdWithPermissions(id);

      if (!group) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      return group;
    });
    return GroupMapper.toGroupResponseDto(result);
  }


  async deleteGroup(id: string): Promise<void> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    await this.groupRepository.deleteGroup(id);
  }


  async addMembers(groupId: string, userIds: string[]) {
    const group = await withTransaction(async (tx) => {
      const groupRepo = new GroupRepository(tx);
      const userRepo = new UserRepository(tx);
      const normalizedUserIds = this.normalizeIds(userIds);

      const group = await groupRepo.findById(groupId);
      if (!group) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      await this.ensureUsersExist(userRepo, normalizedUserIds);

      await groupRepo.addMembers(groupId, normalizedUserIds);

      const result = await groupRepo.findByIdWithPermissions(groupId);
      if (!result) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }
      return result;
    });

    return GroupMapper.toGroupResponseDto(group);
  }

  async removeMembers(groupId: string, userIds: string[]) {
    const group = await withTransaction(async (tx) => {
      const groupRepo = new GroupRepository(tx);
      const userRepo = new UserRepository(tx);
      const normalizedUserIds = this.normalizeIds(userIds);

      const group = await groupRepo.findById(groupId);
      if (!group) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      await this.ensureUsersExist(userRepo, normalizedUserIds);

      await groupRepo.removeMembers(groupId, normalizedUserIds);

      const result = await groupRepo.findByIdWithPermissions(groupId);
      if (!result) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }
      return result;
    });

    return GroupMapper.toGroupResponseDto(group);
  }

  private normalizePermissionKeys(permissionKeys?: string[]): string[] {
    return [...new Set((permissionKeys ?? []).map((permissionKey) => permissionKey.trim()))]
      .filter(Boolean);
  }

  private normalizeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()))].filter(Boolean);
  }

  private async ensureUsersExist(userRepo: UserRepository, userIds: readonly string[]): Promise<void> {
    const existingUserIds = await userRepo.findExistingIdsByIds(userIds);
    const existingUserIdSet = new Set(existingUserIds);
    const hasMissingUser = userIds.some((userId) => !existingUserIdSet.has(userId));

    if (hasMissingUser) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }
  }

}
