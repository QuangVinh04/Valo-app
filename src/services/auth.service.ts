import { ErrorCode } from '../constants/error-code.js';
import env from '../config/env.js';
import {
  AuthResponseDto,
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  OtpRequestDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  RegisterRequestDto,
  ResendOtpRequestDto,
  SetPasswordRequestDto
} from '../types/auth.type.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { GroupRepository } from '../repositories/group.repository.js';
import AppError from '../utils/app-error.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyToken } from '../utils/jwt.util.js';
import { AuthMapper } from '../mapper/auth.mapper.js';
import { withTransaction } from '../database/transaction.js';
import { compareString, generateOtp, hashString } from '../utils/auth.util.js';
import { RedisService } from './redis.service.js';
import { durationToSeconds } from '../utils/time.util.js';
import { accountLinkService, AccountLinkService } from './account-link.service.js';
import { getEmailQueue, SEND_OTP_JOB } from '../queues/email.queue.js';
import { PASSWORD_TOKEN_PURPOSE } from '../constants/password-token.constant.js';
import { passwordSetupService, PasswordSetupService } from './password-setup.service.js';

const getRefreshTokenKey = (userId: string) => {
  return `auth:refresh:${userId}`;
};

type StoredOtp = {
  userId: string;
  hash: string;
};

type OtpRecipient = {
  id: string;
  email: string;
  fullName: string;
};

const REFRESH_TOKEN_TTL = durationToSeconds(env.JWT_REFRESH_DURATION as string);

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly redisService: RedisService;
  private readonly accountLinkService: AccountLinkService;
  private readonly passwordSetupService: PasswordSetupService;

  constructor(
    userRepository: UserRepository,
    redisService = new RedisService(),
    accountLinkService: AccountLinkService,
    passwordSetupService: PasswordSetupService
  ) {
    this.userRepository = userRepository;
    this.redisService = redisService;
    this.accountLinkService = accountLinkService;
    this.passwordSetupService = passwordSetupService;
  }

  private async sendVerificationOtp(
    user: OtpRecipient,
    options: { failOnCooldown?: boolean } = {}
  ): Promise<void> {
    const email = user.email.trim().toLowerCase();
    const cooldownKey = `auth:otp:cooldown:${email}`;
    const isCooldown = await this.redisService.exists(cooldownKey);

    if (isCooldown) {
      if (options.failOnCooldown) {
        throw new AppError(ErrorCode.OTP_RESEND_TOO_SOON);
      }

      return;
    }

    const otp = generateOtp();

    await this.redisService.set<StoredOtp>(
      `auth:otp:${email}`,
      {
        userId: user.id,
        hash: await hashString(otp)
      },
      5 * 60
    );

    await this.redisService.set(cooldownKey, true, 60);

    await getEmailQueue().add(SEND_OTP_JOB, {
      userId: user.id,
      to: user.email,
      fullName: user.fullName,
      otp
    });
  }

  /**
   * Đăng ký tài khoản mới với nhóm mặc định, mật khẩu người dùng nhập và OTP xác minh.
   */
  async registerUser(payload: RegisterRequestDto): Promise<boolean> {
    const email = payload.email.trim().toLowerCase();

    const result = await withTransaction(async (tx) => {
      //TODO: Bkav HoanNTh: dùng singleton
      //FIXME: Bkav VinhTQ: Các repository bắt buộc phải được khởi tạo với tx để toàn bộ query chạy cùng transaction
      const userRepo = new UserRepository(tx);
      const groupRepo = new GroupRepository(tx);

      const existingUser = await userRepo.findByEmail(email);

      if (existingUser) {
        throw new AppError(ErrorCode.EMAIL_ALREADY_IN_USE);
      }

      const groupDefault = await groupRepo.findByName('user');
      if (!groupDefault) {
        throw new AppError(ErrorCode.GROUP_NOT_FOUND);
      }

      const password = await hashString(payload.password);
      const user = await userRepo.createUser({
        fullName: payload.fullName.trim(),
        email,
        password,
        active: false
      });
      await userRepo.assignGroups(user.id, [groupDefault.id]);
      return user;
    });

    await this.sendVerificationOtp(result);

    return true;
  }

  async verifyOtp(payload: OtpRequestDto): Promise<boolean> {
    const storedOtp = await this.redisService.get<StoredOtp>(`auth:otp:${payload.email}`);

    if (!storedOtp) {
      throw new AppError(ErrorCode.INVALID_EXPIRED_OTP);
    }

    const matched = await compareString(payload.otp, storedOtp.hash);
    if (!matched) {
      throw new AppError(ErrorCode.INVALID_EXPIRED_OTP);
    }

    await this.userRepository.activateUser(storedOtp.userId);
    await this.redisService.delete(`auth:otp:${payload.email}`);
    await this.redisService.delete(`auth:otp:cooldown:${payload.email}`);

    return true;
  }

  async resendOtp(payload: ResendOtpRequestDto): Promise<boolean> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    if (!user.password) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Invited accounts must use the invitation link');
    }

    if (user.active) {
      return true;
    }

    await this.sendVerificationOtp(user, { failOnCooldown: true });

    return true;
  }

  /**
   * Xác thực username/mật khẩu, phát access token và lưu refresh token đã hash.
   */
  async loginUser(payload: LoginRequestDto): Promise<{
    authResponse: AuthResponseDto;
    refreshToken: string | null;
  }> {
    const username = payload.username.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(username);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    if (!user.password) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS);
    }

    const isPasswordMatched = await compareString(payload.password, user.password);
    if (!isPasswordMatched) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.active) {
      await this.sendVerificationOtp(user);

      return {
        authResponse: AuthMapper.toAuthResponse(user, null),
        refreshToken: null
      };
    }

    const accessToken = generateAccessToken({
      id: user.id
    });

    const refreshToken = generateRefreshToken({
      id: user.id
    });

    const hashRefreshToken = await hashString(refreshToken);
    await this.redisService.set(getRefreshTokenKey(user.id), hashRefreshToken, REFRESH_TOKEN_TTL);

    //TODO: Bkav HoanNTh: Response login không trả về quá nhiều thông tin như thế này, sau cần có thông tin gì thì call API để lấy
    //FIXME: Bkav VinhTQ: Done
    return {
      authResponse: AuthMapper.toAuthResponse(user, accessToken),
      refreshToken
    };
  }

  /**
   * Kiểm tra refresh token, đối chiếu bản đã hash trong DB và phát access token mới.
   */
  async refreshToken(payload: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    const token = payload.refreshToken;

    if (!token) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Refresh token is required');
    }
    const decoded = verifyRefreshToken(token);

    //TODO: Bkav HoanNTh: tại sao cần call findByIdForAuth mà không phải findById để check user tồn tại hay không?
    //FIXME: Bkav VinhTQ: Done
    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    if (!user.password) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Account password has not been set');
    }

    const storedRefreshToken = await this.redisService.get<unknown>(getRefreshTokenKey(user.id));

    if (!storedRefreshToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'No refresh token found for user');
    }

    if (typeof storedRefreshToken !== 'string') {
      await this.redisService.delete(getRefreshTokenKey(user.id));
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid stored refresh token');
    }

    const isRefreshTokenValid = await compareString(token, storedRefreshToken);

    if (!isRefreshTokenValid) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken({
      id: user.id
    });

    return {
      accessToken
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const permissions = await this.userRepository.findPermissionKeysByUserId(userId);

    if (!permissions) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    return permissions;
  }

  /**
   * Đổi mật khẩu, kiểm tra mật khẩu hiện tại, xác nhận mật khẩu mới và thu hồi refresh token.
   */
  async changePassword(userId: string, payload: ChangePasswordRequestDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    if (!user.password) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Account password has not been set');
    }

    const isCurrentPasswordMatched = await compareString(payload.currentPassword, user.password);
    if (!isCurrentPasswordMatched) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    const isSamePassword = await compareString(payload.newPassword, user.password);
    if (isSamePassword) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        'New password must be different from current password'
      );
    }

    const confirmPasswordMatched = payload.newPassword === payload.confirmPassword;
    if (!confirmPasswordMatched) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'New password and confirm password do not match');
    }

    const newHashedPassword = await hashString(payload.newPassword);

    await this.userRepository.updatePassword({
      userId,
      password: newHashedPassword
    });

    await this.redisService.delete(getRefreshTokenKey(userId));
  }

  /**
   * Luôn trả kết quả giống nhau để không tiết lộ email có tồn tại trong hệ thống hay không.
   */
  async forgotPassword(payload: ForgotPasswordRequestDto): Promise<boolean> {
    const email = payload.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return true;
    }
    if (!user.active || !user.password) {
      return true;
    }

    await this.accountLinkService.sendForgotPassword({
      userId: user.id,
      email: user.email,
      fullName: user.fullName
    });

    return true;
  }
  /** * Đặt mật khẩu thông qua link email. * *
   * Dùng cho:
   * - INVITATION: user được admin mời và đặt mật khẩu lần đầu. *
   * - FORGOT_PASSWORD: user quên mật khẩu và đặt mật khẩu mới. */
  async setPasswordByToken(payload: SetPasswordRequestDto): Promise<void> {
    const tokenData = await this.passwordSetupService.verifyToken(payload.token);
    const user = await this.userRepository.findById(tokenData.userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }
    const expectedPurpose = tokenData.purpose;

    if (expectedPurpose === PASSWORD_TOKEN_PURPOSE.INVITATION && user.active) {
      throw new AppError(ErrorCode.INVALID_TOKEN);
    }

    if (
      expectedPurpose === PASSWORD_TOKEN_PURPOSE.FORGOT_PASSWORD &&
      (!user.active || !user.password)
    ) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_ACTIVE);
    }

    if (expectedPurpose === PASSWORD_TOKEN_PURPOSE.FORGOT_PASSWORD && user.active) {
      const isSamePassword = await compareString(payload.newPassword, user.password);
      if (isSamePassword) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          'New password must be different from current password'
        );
      }
    }
    const hashedPassword = await hashString(payload.newPassword);
    await this.userRepository.updatePasswordAndSession({
      userId: user.id,
      password: hashedPassword
    });

    await this.passwordSetupService.consumeToken(payload.token);
  }

  /**
   * Đăng xuất bằng cách xác thực refresh token và xóa token đang lưu của người dùng.
   */
  async logout(refreshToken: string, accessToken: string): Promise<void> {
    if (!refreshToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Refresh token is required');
    }
    const decoded = verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    await this.redisService.delete(getRefreshTokenKey(user.id));

    const decodedAccess = verifyToken(accessToken);
    const jwtid = decodedAccess.jti;
    const exp = decodedAccess.exp;

    if (jwtid && exp) {
      // Tính thời gian còn lại (TTL) của Access Token bằng giây
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const timeLeftInSeconds = exp - currentTimeInSeconds;

      // Nếu Token chưa hết hạn gốc, lưu jti vào Blacklist của Redis kèm TTL
      if (timeLeftInSeconds > 0) {
        const blacklistKey = `auth:blacklist:${jwtid}`;

        // Giả định redisService của bạn có hàm setEx (hoặc set kèm options)
        await this.redisService.set(blacklistKey, 'revoked', timeLeftInSeconds);
      }
    }
  }
}

export const authService = new AuthService(
  userRepository,
  new RedisService(),
  accountLinkService,
  passwordSetupService
);
