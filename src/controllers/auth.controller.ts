import type { NextFunction, Request, Response } from 'express';
import type {
  AuthResponseDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
  RefreshTokenResponseDto,
  RegisterRequestDto,
} from '../types/auth.type.js';
import { authService, AuthService } from '../services/auth.service.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catch-async.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  private readonly authService: AuthService;

  constructor(service: AuthService) {
    this.authService = service;
  }

  registerUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<boolean>>,
    _next: NextFunction
  ) => {
    const payload = req.body as RegisterRequestDto;
    const result = await this.authService.registerUser(payload);
    return sendSuccess(
      res,
      result,
      'Register successful',
      StatusCodes.CREATED
    );
  });

  loginUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<AuthResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as LoginRequestDto;
    const { authResponse, refreshToken } = await this.authService.loginUser(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(
      res,
      authResponse,
      'Login successful',
      StatusCodes.OK);
  });

  logoutUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<void>>,
    _next: NextFunction
  ) => {
    const refreshToken = req.cookies.refreshToken;

    await this.authService.logout(refreshToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendSuccess(
      res,
      null,
      'Logout successful',
      StatusCodes.OK
    );
  });

  refreshAccessToken = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<RefreshTokenResponseDto>>,
    _next: NextFunction
  ) => {
    const refreshToken = req.cookies.refreshToken;

    const result = await this.authService.refreshToken({ refreshToken });

    return sendSuccess(
      res,
      result,
      'Token refreshed successfully',
      StatusCodes.OK
    );
  });

  changePassword = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    const payload = req.body as ChangePasswordRequestDto;
    const userId = req.user?.userId;

    await this.authService.changePassword(userId, payload);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendSuccess(res, null, 'Password changed successfully', StatusCodes.OK);
  });

  getCurrentUserPermissions = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<string[]>>,
    _next: NextFunction
  ) => {
    const result = await this.authService.getUserPermissions(req.user.userId);

    return sendSuccess(res, result, 'Permissions found', StatusCodes.OK);
  });
}

export const authController = new AuthController(authService);
