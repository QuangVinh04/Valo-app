import type { UserDetail, UserListItem } from '../repositories/user.repository.js';
import type { UserResponseDto, UserListItemDto, UserUpdateResponseDto } from '../types/user.type.js';
import { User } from '@prisma/client';

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
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toUserUpdateResponseDto(user: User): UserUpdateResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
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
      active: user.active,
    };
  }
}
