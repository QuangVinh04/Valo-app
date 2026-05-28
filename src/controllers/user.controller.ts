import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService } from '../services/user.service.js';
import type { CreateUserRequestDto, UpdateUserRequestDto, UserResponseDto } from '../types/user.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getPaginationOptions } from '../utils/pagination.util.js';

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
    const result = await this.userService.getUsers(getPaginationOptions(req.query));
    return sendSuccess(res, result.data, 'Users found', StatusCodes.OK, result.meta);
  });

  getById = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const result = await this.userService.getUserById(this.getIdParam(req));
    return sendSuccess(res, result, 'User found', StatusCodes.OK);
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
    const result = await this.userService.updateUser(this.getIdParam(req), payload);
    return sendSuccess(res, result, 'User updated', StatusCodes.OK);
  });

  delete = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    await this.userService.deleteUser(this.getIdParam(req));
    return sendSuccess(res, null, 'User deleted', StatusCodes.OK);
  });

}

export default UserController;
