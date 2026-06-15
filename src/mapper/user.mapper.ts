import type { UserDetail, UserListItem, UserProfile } from '../repositories/user.repository.js';
import type { UserResponseDto, UserListItemDto, UserProfileResponseDto, UserSettingsDto } from '../types/user.type.js';

export class UserMapper {
  static toUserResponseDto(user: UserDetail): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      groups: user.userGroups.map(({ group }) => ({
        id: group.id,
        name: group.name,
        description: group.description
      })),
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toUserProfileResponseDto(user: UserProfile): UserProfileResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      settings: user.settings as unknown as UserSettingsDto,
    };
  }

  static toUserListItemDto(user: UserListItem): UserListItemDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      groups: user.userGroups.map(({ group }) => ({
        id: group.id,
        name: group.name,
        description: group.description
      })),
    };
  }
}
