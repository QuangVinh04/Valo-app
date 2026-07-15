import env from '../config/env.js';
import { ACCOUNT_LINK_TYPE, type AccountLinkType } from '../constants/account-link.constant.js';
import {
  PASSWORD_TOKEN_PURPOSE,
  type PasswordTokenPurpose
} from '../constants/password-token.constant.js';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import logger from '../utils/logger.util.js';
import { PasswordSetupService, passwordSetupService} from './password-setup.service.js';
import { getEmailQueue, SEND_ACCOUNT_LINK_JOB } from '../queues/email.queue.js';

type SendAccountLinkInput = {
  userId: string;
  email: string;
  fullName: string;
  type: AccountLinkType;
};

export class AccountLinkService {
  constructor(
    private readonly passwordSetupService: PasswordSetupService,
    private readonly userRepo: UserRepository
  ) {}

  async sendInvitation(input: {
    userId: string;
    email: string;
    fullName: string;
  }): Promise<boolean> {
    return this.sendAccountLink({
      ...input,
      type: ACCOUNT_LINK_TYPE.INVITE
    });
  }

  async sendForgotPassword(input: {
    userId: string;
    email: string;
    fullName: string;
  }): Promise<boolean> {
    return this.sendAccountLink({
      ...input,
      type: ACCOUNT_LINK_TYPE.RESET_PASSWORD
    });
  }

  private async sendAccountLink(input: SendAccountLinkInput): Promise<boolean> {
    let token: string | null;

    try {
      const purpose = this.getTokenPurpose(input.type);

      token = await this.passwordSetupService.createToken(input.userId, purpose);

      const link = this.createAccountLinkUrl(token, input.type);

      await getEmailQueue().add(
        SEND_ACCOUNT_LINK_JOB,
        {
          userId: input.userId,
          to: input.email,
          fullName: input.fullName,
          link,
          type: input.type
        },
      );

      if (input.type === ACCOUNT_LINK_TYPE.INVITE) {
        await this.userRepo.updateInvitationEmailFailed(input.userId, false);
      }

      return true;
    } catch (error) {
      if (token) {
        await this.passwordSetupService.consumeToken(token).catch(() => undefined);
      }

      if (input.type === ACCOUNT_LINK_TYPE.INVITE) {
        await this.userRepo.updateInvitationEmailFailed(input.userId, true);
      }

      logger.error('Failed to enqueue account link email', {
        userId: input.userId,
        type: input.type,
        message: error instanceof Error ? error.message : String(error)
      });

      return false;
    }
  }

  private getTokenPurpose(type: AccountLinkType): PasswordTokenPurpose {
    switch (type) {
      case ACCOUNT_LINK_TYPE.INVITE:
        return PASSWORD_TOKEN_PURPOSE.INVITATION;

      case ACCOUNT_LINK_TYPE.RESET_PASSWORD:
        return PASSWORD_TOKEN_PURPOSE.FORGOT_PASSWORD;
    }
  }

  private createAccountLinkUrl(token: string, type: AccountLinkType): string {
    const pathname = type === ACCOUNT_LINK_TYPE.INVITE ? '/set-password' : '/reset-password';

    const url = new URL(pathname, env.APP_URL);

    url.searchParams.set('token', token);

    return url.toString();
  }
}

export const accountLinkService = new AccountLinkService(passwordSetupService, userRepository);
