import { AuthResponseDto } from '../types/auth.type.js';

type AuthUserGroup = {
  group: {
    id: string;
    name: string;
    description: string | null;
    groupPermissions: Array<{
      permissionKey: string;
    }>;
  };
};

type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
  userGroups: AuthUserGroup[];
  createdAt: Date;
  updatedAt: Date;
};

export class AuthMapper {
  static toAuthResponse(
    user: AuthUser,
    accessToken: string | null
  ): AuthResponseDto {
    const groups = user.userGroups.map(({ group }) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      permissions: group.groupPermissions.map((permission) => permission.permissionKey)
    }));
    const permissions = [...new Set(groups.flatMap((group) => group.permissions))];

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      groups,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accessToken,
      permissions
    };
  }
}
