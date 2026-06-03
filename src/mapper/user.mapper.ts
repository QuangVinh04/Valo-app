import type { UserFull } from '../repositories/user.repository.js';
import type { UserResponseDto, UserSettingsDto } from '../types/user.type.js';

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
      settings: normalizeSettings(user.settings)
    };
  }
}
