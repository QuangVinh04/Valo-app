import { ErrorCode } from '../constants/error-code.js';
import {
  AuthResponseDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto
} from '../types/auth.type.js';
import { UserRepository } from '../repositories/user.repository.js';
import { GroupRepository } from '../repositories/group.repository.js';
import AppError from '../utils/app-error.js';
import { generateAccessToken, verifyRefreshToken, generateRefreshToken } from '../utils/jwt.util.js';
import { AuthMapper } from '../mapper/auth.mapper.js';
import { withTransaction } from '../database/transaction.js';
import { generateTemporaryPassword } from '../utils/password.util.js';
import { EmailService } from './email.service.js';
import { hashString, compareString } from '../utils/auth.util.js';
import type { UserFull } from '../repositories/user.repository.js';



export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly groupRepository: GroupRepository;
  private readonly emailService: EmailService;

  constructor(
    userRepository: UserRepository,
    groupRepository: GroupRepository,
    emailService = new EmailService()) {
    this.userRepository = userRepository;
    this.groupRepository = groupRepository;
    this.emailService = emailService;
  }

  private getPermissionKeys(user: UserFull): string[] {
    return [
      ...new Set(
        user.userGroups.flatMap((userGroup) =>
          userGroup.group.groupPermissions.map((permission) => permission.permissionKey)
        )
      )
    ];
  }

  async registerUser(payload: RegisterRequestDto): Promise<AuthResponseDto> {
    const email = payload.email.trim().toLowerCase();
    const temporaryPassword = generateTemporaryPassword();


    const result = await withTransaction(async (tx) => {
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
        mustChangePassword: true,
        groupIds: [groupDefault.id],

      });
      return user;
    });

    await this.emailService.sendTemporaryPasswordEmail({
      to: result.email,
      fullName: result.fullName,
      temporaryPassword
    });

    return AuthMapper.toAuthResponse(result, null);
  }

  async loginUser(payload: LoginRequestDto): Promise<{
    authResponse: AuthResponseDto;
    refreshToken: string;
  }> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmailForAuth(email);

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const isPasswordMatched = await compareString(payload.password, user.password);
    if (!isPasswordMatched) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS);
    }

    const accessToken = generateAccessToken({
      id: user.id,
      permissions: this.getPermissionKeys(user),
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
    });

    const hashedRefreshToken = await hashString(refreshToken);

    await this.userRepository.saveRefreshToken({
      userId: user.id,
      refreshToken: hashedRefreshToken,
    });

    return {
      authResponse: AuthMapper.toAuthResponse(user, accessToken),
      refreshToken
    };
  }

  async refreshToken(payload: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    const token = payload.refreshToken;

    if (!token) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Refresh token is required');
    }
    const decoded = verifyRefreshToken(token);

    const user = await this.userRepository.findByIdForAuth(decoded.userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    const storedRefreshToken = await this.userRepository.findRefreshTokenByUserId(user.id);

    if (!storedRefreshToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'No refresh token found for user');
    }

    const isRefreshTokenValid = await compareString(token, storedRefreshToken);

    if (!isRefreshTokenValid) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken({
      id: user.id,
      permissions: this.getPermissionKeys(user),
    });

    return AuthMapper.toAuthResponse(user, accessToken);
  }

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

    await withTransaction(async (tx) => {
      const userRepo = new UserRepository(tx);

      await userRepo.updatePassword({
        userId,
        password: newHashedPassword
      });

      await userRepo.deleteRefreshTokenByUserId(userId);
    });
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Refresh token is required');
    }
    const decoded = verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    await this.userRepository.deleteRefreshTokenByUserId(user.id);
  }
}

export default AuthService;
