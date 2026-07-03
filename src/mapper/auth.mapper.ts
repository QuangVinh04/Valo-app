import { User } from '@prisma/client';
import { AuthResponseDto } from '../types/auth.type.js';
import { UserSettingsDto } from '../types/user.type.js';




//TODO: Bkav HoanNTh: Rà soát lại toàn bộ mapper, chỉ trả những thông tin cần
//FIXME: Bkav VinhTQ: Done
export class AuthMapper {
  static toAuthResponse(
    user: User,
    accessToken: string | null
  ): AuthResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      active: user.active,
      accessToken,
      settings: user.settings as UserSettingsDto,
    };
  }
}
