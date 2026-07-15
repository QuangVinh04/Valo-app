import { generateSecureToken, hashToken } from '../utils/auth.util.js';
import { redisService, RedisService } from './redis.service.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { PasswordTokenPurpose } from '../constants/password-token.constant.js';

export const PASSWORD_TOKEN_TTL_SECONDS = {
  INVITATION: 24 * 60 * 60,
  FORGOT_PASSWORD: 15 * 60
} as const;

type StoredPasswordToken = {
  userId: string;
  purpose: PasswordTokenPurpose;
};

export class PasswordSetupService {
  constructor(private readonly redisService: RedisService) {}

  async createToken(userId: string, purpose: PasswordTokenPurpose): Promise<string> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const ttl = PASSWORD_TOKEN_TTL_SECONDS[purpose];

    await this.redisService.set<StoredPasswordToken>(
      this.getKey(tokenHash),
      {
        userId,
        purpose
      },
      ttl
    );

    return rawToken;
  }
  async verifyToken(rawToken: string): Promise<StoredPasswordToken> {
    const tokenHash = hashToken(rawToken);

    const storedToken = await this.redisService.get<StoredPasswordToken>(this.getKey(tokenHash));

    if (!storedToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN);
    }

    if (!storedToken.userId || !storedToken.purpose) {
      throw new AppError(ErrorCode.INVALID_TOKEN);
    }

    return storedToken;
  }

  async consumeToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    await this.redisService.delete(this.getKey(tokenHash));
  }

  private getKey(tokenHash: string): string {
    return `auth:password-token:${tokenHash}`;
  }
}

export const passwordSetupService = new PasswordSetupService(redisService);
