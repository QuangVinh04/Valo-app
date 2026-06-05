import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService } from '../services/user.service.js';
import type { CreateUserRequestDto, UpdateUserRequestDto, UserProfileDto, UserResponseDto, UserSettingsDto } from '../types/user.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getPaginationOptions } from '../utils/pagination.util.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  private getIdParam(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  list = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto[]>>,
    _next: NextFunction
  ) => {

    const pagination = getPaginationOptions(req.query);
    const result = await this.userService.getUsers(pagination);
    return sendSuccess(res, result.data, 'Users found', StatusCodes.OK, result.meta);
  });

  getById = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {

    const id = this.getIdParam(req);
    const result = await this.userService.getUserById(id);
    return sendSuccess(res, result, 'User found', StatusCodes.OK);
  });

  me = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const result = await this.userService.getUserById(req.user.userId);
    return sendSuccess(res, result, 'Current user found', StatusCodes.OK);
  });

  create = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as CreateUserRequestDto;
    const result = await this.userService.createUser(payload);
    return sendSuccess(res, result, 'User created', StatusCodes.CREATED);
  });

  update = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UpdateUserRequestDto;
    const id = this.getIdParam(req);
    const result = await this.userService.updateUser(id, payload);
    return sendSuccess(res, result, 'User updated', StatusCodes.OK);
  });

  updateSettings = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UserSettingsDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UserSettingsDto;
    const result = await this.userService.updateSettings(req.user.userId, payload);
    return sendSuccess(res, result, 'User settings updated', StatusCodes.OK);
  });

  updateProfile = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UserProfileDto;
    const result = await this.userService.updateProfile(req.user.userId, payload);
    return sendSuccess(res, result, 'User profile updated', StatusCodes.OK);
  });

  delete = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    const id = this.getIdParam(req);
    await this.userService.deleteUser(id);
    return sendSuccess(res, null, 'User deleted', StatusCodes.OK);
  });

  deleteMe = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    await this.userService.deleteUser(req.user.userId);
    return sendSuccess(res, null, 'Account deleted', StatusCodes.OK);
  });

}

export default UserController;
