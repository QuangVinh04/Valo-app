import { GroupRepository, groupRepository } from '../repositories/group.repository.js';
import { BulkDeleteGroupsResponseDto, CreatedGroupDto, GroupMemberDto, GroupRequestDto, GroupResponseDto, UpdateGroupRequestDto, UpdateGroupResponseDto } from '../types/group.type.js';
import { GroupMapper } from '../mapper/group.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
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

interface GroupMembersPaginatedResult {
  data: GroupMemberDto;
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

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
  async getGroups(pagination: PaginationOptions, filters: { search?: string } = {}): Promise<any> {
    const normalizedFilters = {
      search: filters.search?.trim() || undefined
    };

    const [groups, totalItems] = await Promise.all([
      this.groupRepository.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        ...normalizedFilters
      }),
      this.groupRepository.count(normalizedFilters)
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
    const group = await this.groupRepository.findDetailById(id);
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
    //TODO: Bkav HoanNTh: dùng singleton
    //FIXME: Bkav VinhTQ: Done
    const newGroup = await this.groupRepository.createGroup({
      name,
      description: payload.description?.trim(),
      permissions: this.normalizePermissionKeys(payload.permissions)
    });

    return { id: newGroup.id };
  }

  /**
   * Cập nhật thông tin nhóm và thay thế danh sách quyền nếu payload có truyền permissions.
   */
  async updateGroup(id: string, payload: UpdateGroupRequestDto): Promise<UpdateGroupResponseDto> {
    const group = await this.groupRepository.findById(id);

    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    const name = payload.name?.trim();
    if (name) {
      const existingGroup = await this.groupRepository.findByNameExceptId(name, id);
      if (existingGroup) {
        throw new AppError(ErrorCode.GROUP_NAME_ALREADY_IN_USE);
      }
    }

    const permissions =
      payload.permissions !== undefined
        ? this.normalizePermissionKeys(payload.permissions)
        : undefined;

    //TODO: L2: Bkav HoanNTh: Tại sao xóa xong tạo lại mà không phải update và phải gọi xử lý DB 3 lần
    //FIXME: Bkav VinhTQ: Done
    const updatedGroup = await this.groupRepository.updateGroup(id, {
      name,
      description: payload.description?.trim(),
      permissions
    });

    return GroupMapper.toUpdateGroupResponseDto(updatedGroup);
  }

  /**
   * Xóa nhóm sau khi xác nhận nhóm tồn tại.
   */
  async deleteGroup(id: string): Promise<void> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }
    if (group.isSystem) {
      throw new AppError(ErrorCode.CANNOT_DELETE_SYSTEM_GROUP);
    }

    await this.groupRepository.deleteGroup(id);
  }



  async deleteGroups(ids: string[]): Promise<BulkDeleteGroupsResponseDto> {
    const uniqueIds = this.normalizeIds(ids);

    const existingGroups = await this.groupRepository.findManyByIds(uniqueIds);

    const existingIdSet = new Set(existingGroups.map((group) => group.id));
    const notFoundIds = uniqueIds.filter((id) => !existingIdSet.has(id));

    const systemGroups = existingGroups.filter((group) => group.isSystem);

    if (systemGroups.length > 0) {
      throw new AppError(ErrorCode.CANNOT_DELETE_SYSTEM_GROUP);
    }

    const deletedCount = await this.groupRepository.deleteManyByIds(
      existingGroups.map((group) => group.id)
    );

    return {
      deletedCount,
      notFoundIds
    };
  }

  /**
   * Lay danh sach thanh vien trong nhom
   */
  async getGroupMembers(
    groupId: string,
    pagination?: PaginationOptions,
    filters: { search?: string } = {}
  ): Promise<GroupMemberDto | GroupMembersPaginatedResult> {
    const normalizedFilters = {
      search: filters.search?.trim() || undefined
    };

    if (!pagination) {
      const group = await this.groupRepository.findMembersById(groupId);
      if (!group) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      return GroupMapper.toGroupMemberResponseDto(group);
    }

    const [group, totalItems] = await Promise.all([
      this.groupRepository.findMembersPageById(groupId, {
        skip: pagination.skip,
        take: pagination.limit,
        ...normalizedFilters
      }),
      this.groupRepository.countMembers(groupId, normalizedFilters)
    ]);

    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    return {
      data: GroupMapper.toGroupMemberResponseDto(group),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / pagination.limit)
      }
    };
  }

  /**
   * Thêm người dùng vào nhóm và trả về nhóm đã cập nhật.
   */
  async addMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
    //TODO: Bkav HoanNTh: dùng singleton
    //FIXME: Bkav VinhTQ: Done
    const normalizedUserIds = this.normalizeIds(userIds);

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    await this.ensureUsersExist(this.userRepository, normalizedUserIds);

    await this.groupRepository.addMembers(groupId, normalizedUserIds);

    const result = await this.groupRepository.findMembersById(groupId);

    //TODO: trường hợp nào result undefine?
    //FIXME: Bkav VinhTQ: Done

    return GroupMapper.toGroupMemberResponseDto(result);
  }

  /**
   * Gỡ người dùng khỏi nhóm
   */
  async removeMembers(groupId: string, userIds: string[]) {
    const normalizedUserIds = this.normalizeIds(userIds);

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    await this.ensureUsersExist(this.userRepository, normalizedUserIds);

    if (group.name === 'admin' && group.isSystem) {
      const totalActiveAdmins = await this.userRepository.countActiveAdmins();
      const removingActiveAdmins =
        await this.userRepository.countActiveAdminsByIds(normalizedUserIds);

      if (totalActiveAdmins - removingActiveAdmins < 1) {
        throw new AppError(ErrorCode.CANNOT_DELETE_LAST_ADMIN);
      }
    }

    await this.groupRepository.removeMembers(groupId, normalizedUserIds);

    const result = await this.groupRepository.findMembersById(groupId);

    return GroupMapper.toGroupMemberResponseDto(result);
  }

  /**
   * Chuẩn hóa danh sách quyền, tự động thêm các quyền cơ bản cho nhóm mới hoặc nhóm cập nhật.
   */
  private normalizePermissionKeys(permissionKeys?: string[]): string[] {
    return [
      ...new Set([
        ...DEFAULT_GROUP_PERMISSION_KEYS,
        ...(permissionKeys ?? []).map((permissionKey) => permissionKey.trim())
      ])
    ].filter(Boolean);
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
  private async ensureUsersExist(
    userRepo: UserRepository,
    userIds: readonly string[]
  ): Promise<void> {
    const existingUserIds = await userRepo.findExistingIdsByIds(userIds);
    const existingUserIdSet = new Set(existingUserIds);
    const hasMissingUser = userIds.some((userId) => !existingUserIdSet.has(userId));

    if (hasMissingUser) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }
  }
}

export const groupService = new GroupService(groupRepository, userRepository);
