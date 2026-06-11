import { GroupRepository } from '../repositories/group.repository.js';
import { CreatedGroupDto, GroupMemberDto, GroupRequestDto, GroupResponseDto, UpdateGroupRequestDto } from '../types/group.type.js';
import { withTransaction } from '../database/transaction.js';
import { GroupMapper } from '../mapper/group.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
  buildPaginatedResult,
  type PaginationOptions
} from '../utils/pagination.util.js';
import { PermissionConstant } from '../constants/permission.constant.js';

const DEFAULT_GROUP_PERMISSION_KEYS = [
  PermissionConstant.CHAT.key,
  PermissionConstant.CONV_CREATE.key,
  PermissionConstant.CONV_READ.key,
  PermissionConstant.CONV_UPDATE.key,
  PermissionConstant.CONV_DELETE.key,
];

export class GroupService {
  private readonly groupRepository: GroupRepository;
  private readonly userRepository: UserRepository;

  constructor(groupRepository: GroupRepository, userRepository: UserRepository) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
  }

  /**
   * Lấy danh sách nhóm theo phân trang và chuyển sang DTO trả về cho client.
   */
  async getGroups(pagination: PaginationOptions): Promise<any> {
    const [groups, totalItems] = await Promise.all([
      this.groupRepository.findMany({
        skip: pagination.skip,
        take: pagination.limit
      }),
      this.groupRepository.count()
    ]);

    return buildPaginatedResult(
      groups.map((group) => GroupMapper.toGroupListItemDto(group)),
      totalItems,
      pagination
    );
  }

  /**
   * Lấy chi tiết một nhóm kèm quyền; báo lỗi nếu nhóm không tồn tại.
   */
  async getGroupById(id: string): Promise<GroupResponseDto> {
    const group = await this.groupRepository.findFullById(id);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    return GroupMapper.toGroupResponseDto(group);
  }

  /**
   * Tạo nhóm mới sau khi chuẩn hóa tên, kiểm tra trùng tên và gán quyền mặc định.
   */
  async createGroup(payload: GroupRequestDto): Promise<CreatedGroupDto> {
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

    return { id: result.id };
  }

  /**
   * Cập nhật thông tin nhóm và thay thế danh sách quyền nếu payload có truyền permissions.
   */
  async updateGroup(id: string, payload: UpdateGroupRequestDto): Promise<boolean> {
    const result = await withTransaction(async (tx) => {
      const groupRepo = new GroupRepository(tx);
      const group = await groupRepo.findById(id);

      if (!group) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      const name = payload.name?.trim();
      if (name) {
        const existingGroup = await groupRepo.findByNameExceptId(name, id);
        if (existingGroup) {
          throw new AppError(ErrorCode.GROUP_NAME_ALREADY_IN_USE);
        }
      }

      await groupRepo.updateGroup(id, {
        name,
        description: payload.description?.trim(),
      });

      if (payload.permissions !== undefined) {
        const permissionKeys = this.normalizePermissionKeys(payload.permissions);

        await groupRepo.deletePermissions(id);

        if (permissionKeys.length > 0) {
          await groupRepo.createPermissions(id, permissionKeys);
        }
      }
    });
    return true;
  }


  /**
   * Xóa nhóm sau khi xác nhận nhóm tồn tại.
   */
  async deleteGroup(id: string): Promise<void> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    await this.groupRepository.deleteGroup(id);
  }



   /**
   * Lay danh sach thanh vien trong nhom
   */
  async getGroupMembers(groupId: string): Promise<GroupMemberDto> {
    const group = await this.groupRepository.findFullById(groupId);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }
    
    return GroupMapper.toGroupMemberResponseDto(group);
  }

  /**
   * Thêm người dùng vào nhóm trong một transaction và trả về nhóm đã cập nhật.
   */
  async addMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
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

      const result = await groupRepo.findFullById(groupId);

      return result;
    });

    return GroupMapper.toGroupMemberResponseDto(group);
  }

  /**
   * Gỡ người dùng khỏi nhóm trong một transaction và trả về nhóm đã cập nhật.
   */
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

      return await groupRepo.findFullById(groupId);

    });

    return GroupMapper.toGroupMemberResponseDto(group);
  }

  /**
   * Chuẩn hóa danh sách quyền, tự động thêm các quyền cơ bản cho nhóm mới hoặc nhóm cập nhật.
   */
  private normalizePermissionKeys(permissionKeys?: string[]): string[] {
    return [...new Set([
      ...DEFAULT_GROUP_PERMISSION_KEYS,
      ...(permissionKeys ?? []).map((permissionKey) => permissionKey.trim())
    ])]
      .filter(Boolean);
  }

  /**
   * Loại bỏ khoảng trắng, giá trị rỗng và ID bị trùng trong danh sách đầu vào.
   */
  private normalizeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()))].filter(Boolean);
  }

  /**
   * Đảm bảo toàn bộ userId đều tồn tại trước khi thay đổi thành viên nhóm.
   */
  private async ensureUsersExist(userRepo: UserRepository, userIds: readonly string[]): Promise<void> {
    const existingUserIds = await userRepo.findExistingIdsByIds(userIds);
    const existingUserIdSet = new Set(existingUserIds);
    const hasMissingUser = userIds.some((userId) => !existingUserIdSet.has(userId));

    if (hasMissingUser) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }
  }

}
