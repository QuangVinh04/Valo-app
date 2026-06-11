import { User } from '@prisma/client';
import { AuthResponseDto } from '../types/auth.type.js';
import { UserSettingsDto, UserSettingsSchema } from '../types/user.type.js';

const defaultUserSettings: UserSettingsDto = {
  theme: 'dark',
  language: 'vi',
};

function mapUserSettings(settings: User['settings']): UserSettingsDto {
  const result = UserSettingsSchema.safeParse(settings);
  return result.success ? result.data : defaultUserSettings;
}

export class AuthMapper {
  static toAuthResponse(
    user: User,
    accessToken: string
  ): AuthResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      mustChangePassword: user.mustChangePassword,
      accessToken,
      settings: mapUserSettings(user.settings),
    };
  }
}
