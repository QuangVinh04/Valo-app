import { User } from '@prisma/client';
import type { UserFull } from '../repositories/user.repository.js';
import type { UserResponseDto, UserListItemDto, UserProfileResponseDto, UserSettingsDto } from '../types/user.type.js';

export class UserMapper {
  static toUserResponseDto(user: UserFull): UserResponseDto {
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

  static toUserProfileResponseDto(user: User): UserProfileResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      settings: user.settings as unknown as UserSettingsDto,
    };
  }

  static toUserListItemDto(user: UserFull): UserListItemDto {
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
