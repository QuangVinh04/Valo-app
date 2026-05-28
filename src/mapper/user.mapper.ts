import type { UserWithGroupsAndPermissions } from '../repositories/user.repository.js';
import type { UserResponseDto } from '../types/user.type.js';

export class UserMapper {
  static toUserResponseDto(user: UserWithGroupsAndPermissions): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      groups: user.userGroups.map(({ group }) => ({
        id: group.id,
        name: group.name,
        description: group.description
      })),
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
