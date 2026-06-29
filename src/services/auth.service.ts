import { ErrorCode } from '../constants/error-code.js';
import env from  '../config/env.js';
import {
  AuthResponseDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  RegisterRequestDto,
} from '../types/auth.type.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { GroupRepository } from '../repositories/group.repository.js';
import AppError from '../utils/app-error.js';
import { generateAccessToken, verifyRefreshToken, generateRefreshToken, verifyToken } from '../utils/jwt.util.js';
import { AuthMapper } from '../mapper/auth.mapper.js';
import { withTransaction } from '../database/transaction.js';
import { generateTemporaryPassword } from '../utils/password.util.js';
import { EmailService } from './email.service.js';
import { hashString, compareString } from '../utils/auth.util.js';
import { RedisService } from './redis.service.js';
import { durationToSeconds } from '../utils/time.util.js';

const getRefreshTokenKey = (userId: string) => {
  return `auth:refresh:${userId}`;
};

const REFRESH_TOKEN_TTL = durationToSeconds(env.JWT_REFRESH_DURATION as string);

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly emailService: EmailService;
  private readonly redisService: RedisService;

  constructor(
    userRepository: UserRepository,
    emailService = new EmailService(),
    redisService = new RedisService()) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.redisService = redisService;
  }


  /**
   * Đăng ký tài khoản mới với nhóm mặc định, mật khẩu tạm thời và email thông báo.
   */
  async registerUser(payload: RegisterRequestDto): Promise<boolean> {
    const email = payload.email.trim().toLowerCase();
    const temporaryPassword = generateTemporaryPassword();

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

      const password = await hashString(temporaryPassword);
      const user = await userRepo.createUser({
        fullName: payload.fullName.trim(),
        email,
        password,
        mustChangePassword: true
      });
      await userRepo.assignGroups(user.id, [groupDefault.id]);
      return user;
    });

    await this.emailService.sendTemporaryPasswordEmail({
      to: result.email,
      fullName: result.fullName,
      temporaryPassword
    });

    /*TODO: Bkav HoanNTh: TH đăng ký, sau khi gửi email có chứa password, user tự đăng nhập lại
       không trả về token và thông tin chi tiết của user sau khi đăng ký, chỉ trả message để user biết cần check email*/
    // FIXME: Bkav VinhTQ: Done
    return true;
  }

  /**
   * Xác thực username/mật khẩu, phát access token và lưu refresh token đã hash.
   */
  async loginUser(payload: LoginRequestDto): Promise<{
    authResponse: AuthResponseDto;
    refreshToken: string;
  }> {
    const username = payload.username.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(username);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const isPasswordMatched = await compareString(payload.password, user.password);
    if (!isPasswordMatched) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS);
    }

    const accessToken = generateAccessToken({
      id: user.id
    });

    const refreshToken = generateRefreshToken({
      id: user.id
    });

    const hashRefreshToken = hashString(refreshToken);
    await this.redisService.set(
      getRefreshTokenKey(user.id),
      hashRefreshToken,
      REFRESH_TOKEN_TTL
    );


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

    const storedRefreshToken = await this.redisService.get<string>(getRefreshTokenKey(user.id));

    if (!storedRefreshToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'No refresh token found for user');
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

    const isCurrentPasswordMatched = await compareString(payload.currentPassword, user.password);
    if (!isCurrentPasswordMatched) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    const isSamePassword = await compareString(payload.newPassword, user.password);
    if (isSamePassword) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'New password must be different from current password');
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

export const authService = new AuthService(userRepository);
