import { ErrorCode } from '../constants/error-code.js';
import { UserMapper } from '../mapper/user.mapper.js';
import { GroupRepository, groupRepository } from '../repositories/group.repository.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import type { AssignUserGroupsRequestDto, BulkDeleteUsersResponseDto, CreatedUserDto, CreateUserRequestDto, UpdateUserRequestDto, UserListItemDto, UserResponseDto, UserSettingsDto, UserUpdateResponseDto } from '../types/user.type.js';
import AppError from '../utils/app-error.js';
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationOptions
} from '../utils/pagination.util.js';
import { accountLinkService, AccountLinkService } from './account-link.service.js';


export interface UserListFilters {
  search?: string;
  groupId?: string;
  active?: boolean;
}

export class UserService {
  private readonly userRepo: UserRepository;
  private readonly groupRepo: GroupRepository;
  private readonly accountLinkService: AccountLinkService;

  constructor(
    userRepository: UserRepository,
    groupRepository: GroupRepository,
    accountLinkService: AccountLinkService
  ) {
    this.userRepo = userRepository;
    this.groupRepo = groupRepository;
    this.accountLinkService = accountLinkService;
  }

  /**
   * Lấy danh sách người dùng theo phân trang và chuyển dữ liệu sang DTO an toàn.
   */
  async getUsers(
    pagination: PaginationOptions,
    filters: UserListFilters = {}
  ): Promise<PaginatedResult<UserListItemDto>> {
    const normalizedFilters = {
      search: filters.search?.trim() || undefined,
      groupId: filters.groupId?.trim() || undefined,
      active: filters.active
    };

    const [users, totalItems] = await Promise.all([
      this.userRepo.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        ...normalizedFilters
      }),
      this.userRepo.count(normalizedFilters)
    ]);

    return buildPaginatedResult(users.map(UserMapper.toUserListItemDto), totalItems, pagination);
  }

  /**
   * Lấy thông tin một người dùng theo ID; báo lỗi nếu không tìm thấy.
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findDetailById(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    return UserMapper.toUserResponseDto(user);
  }

  /**
   * Tạo tài khoản inactive và gửi liên kết để người dùng tự đặt mật khẩu, kích hoạt tài khoản.
   */
  async createUser(payload: CreateUserRequestDto): Promise<CreatedUserDto> {
    const email = payload.email.trim().toLowerCase();

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_IN_USE);
    }

    const user = await this.userRepo.createUser({
      fullName: payload.fullName.trim(),
      email,
      phoneNumber: payload.phoneNumber?.trim() || null,
      address: payload.address?.trim() || null,
      password: null,
      active: false,
      invitationEmailFailed: false
    });

    await this.accountLinkService.sendInvitation(
      {
        email: user.email,
        fullName: user.fullName,
        userId: user.id
      }
    )

    return { id: user.id };
  }

  async resendInvitation(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    if (user.active || user.password !== null) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        'Only pending invited users can receive another invitation'
      );
    }

    return this.accountLinkService.sendInvitation({
      userId: user.id,
      email: user.email,
      fullName: user.fullName
    });
  }

  //TODO: Bkav HoanNTh: tách biệt riêng update user và add user vào group
  // Bkav VinhTQ: Done

  //TODO: Bkav HoanNTh: updateProfile khác gì với updateUser
  // Bkav VinhTQ: Done

  /**
   * Cập nhật thông tin cơ bản của người dùng, không thay đổi nhóm.
   */
  async updateUser(id: string, payload: UpdateUserRequestDto): Promise<UserUpdateResponseDto> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const updatedUser = await this.userRepo.updateUser(id, {
      fullName: payload.fullName?.trim(),
      ...(payload.phoneNumber !== undefined
        ? { phoneNumber: payload.phoneNumber.trim() || null }
        : {}),
      ...(payload.address !== undefined ? { address: payload.address.trim() || null } : {})
    });

    return UserMapper.toUserUpdateResponseDto(updatedUser);
  }

  /**
   * Gán thêm nhóm cho người dùng sau khi xác thực người dùng và toàn bộ groupId tồn tại.
   */
  async assignGroups(userId: string, payload: AssignUserGroupsRequestDto): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const groupIds = await this.ensureGroupsExist(payload.groupIds);

    await this.userRepo.assignGroups(userId, groupIds);

    return true;
  }

  /**
   * Cập nhật thiết lập cá nhân của người dùng hiện tại như giao diện và ngôn ngữ.
   */
  async updateSettings(userId: string, payload: UserSettingsDto): Promise<UserSettingsDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    await this.userRepo.updateSettings(userId, {
      theme: payload.theme,
      language: payload.language
    });

    return {
      theme: payload.theme,
      language: payload.language
    };
  }

  /**
   * Xóa người dùng sau khi xác nhận người dùng tồn tại.
   */
  async deleteUser(id: string) {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const isDeletingAdmin = await this.userRepo.countActiveAdminsByIds([id]);

    if (isDeletingAdmin > 0) {
      const totalActiveAdmins = await this.userRepo.countActiveAdmins();

      if (totalActiveAdmins <= 1) {
        throw new AppError(ErrorCode.CANNOT_DELETE_LAST_ADMIN);
      }
    }

    await this.userRepo.deleteUser(id);
  }

  async deleteUsers(ids: string[]): Promise<BulkDeleteUsersResponseDto> {
    const uniqueIds = [...new Set(ids)];

    const existingIds = await this.userRepo.findExistingIdsByIds(uniqueIds);
    const existingIdSet = new Set(existingIds);
    const notFoundIds = uniqueIds.filter((id) => !existingIdSet.has(id));

    const totalActiveAdmins = await this.userRepo.countActiveAdmins();
    const deletingAdminCount = await this.userRepo.countActiveAdminsByIds(existingIds);

    if (deletingAdminCount > 0 && totalActiveAdmins - deletingAdminCount < 1) {
      throw new AppError(ErrorCode.CANNOT_DELETE_LAST_ADMIN);
    }

    const deletedCount = await this.userRepo.deleteManyByIds(existingIds);

    return {
      deletedCount,
      notFoundIds
    };
  }

  /**
   * Trả về danh sách groupId hợp lệ.
   */
  private async ensureGroupsExist(groupIds: string[]): Promise<string[]> {
    const ids = [...new Set(groupIds.map((id) => id.trim()))].filter(Boolean);

    const existingGroups = await this.groupRepo.findManyByIds(ids);

    if (existingGroups.length !== ids.length) {
      throw new AppError(ErrorCode.GROUP_NOT_FOUND);
    }

    return ids;
  }
}


export const userService = new UserService(userRepository, groupRepository, accountLinkService);
