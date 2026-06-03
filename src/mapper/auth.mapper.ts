import { AuthResponseDto, type UserSettingsDto } from '../types/auth.type.js';

const defaultSettings: UserSettingsDto = {
  theme: 'dark',
  language: 'vi'
};

function normalizeSettings(settings: unknown): UserSettingsDto {
  if (!settings || typeof settings !== 'object') {
    return defaultSettings;
  }

  const value = settings as Partial<UserSettingsDto>;

  return {
    theme: value.theme === 'light' ? 'light' : 'dark',
    language: value.language === 'en' ? 'en' : 'vi'
  };
}

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
  phoneNumber: string | null;
  address: string | null;
  mustChangePassword: boolean;
  userGroups: AuthUserGroup[];
  createdAt: Date;
  updatedAt: Date;
  settings: unknown;
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
      phoneNumber: user.phoneNumber,
      address: user.address,
      groups,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accessToken,
      permissions,
      settings: normalizeSettings(user.settings)
    };
  }
}
