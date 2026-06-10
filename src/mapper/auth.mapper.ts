import { User } from '@prisma/client';
import { AuthResponseDto} from '../types/auth.type.js';



export class AuthMapper {
  static toAuthResponse(
    user: User,
    accessToken: string | null
  ): AuthResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
      accessToken,
      settings: user.settings
    };
  }
}
