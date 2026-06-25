import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService, userService } from '../services/user.service.js';
import type { AssignUserGroupsRequestDto, CreatedUserDto, CreateUserRequestDto, UpdateUserRequestDto, UserListItemDto, UserResponseDto, UserSettingsDto, UserUpdateResponseDto } from '../types/user.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getPaginationOptions } from '../utils/pagination.util.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }


  private getListFilters(req: Request) {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
    const mustChangePassword = req.query.mustChangePassword === 'true'
      ? true
      : req.query.mustChangePassword === 'false'
        ? false
        : undefined;

    return {
      search,
      groupId,
      mustChangePassword,
    };
  }

  getUsers = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserListItemDto[]>>,
    _next: NextFunction
  ) => {

    const pagination = getPaginationOptions(req.query);
    const result = await this.userService.getUsers(pagination, this.getListFilters(req));
    return sendSuccess(res, result.data, 'Users found', StatusCodes.OK, result.meta);
  });

  getUserById = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {

    const id = req.params.id.toString();
    const result = await this.userService.getUserById(id);
    return sendSuccess(res, result, 'User found', StatusCodes.OK);
  });

  //TODO: Bkav HoanNTh: đặt lại tên hàm
  // Bkav VinhTQ: Done
  getCurrentUser = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UserResponseDto>>,
    _next: NextFunction
  ) => {
    const result = await this.userService.getUserById(req.user.userId);
    return sendSuccess(res, result, 'Current user found', StatusCodes.OK);
  });

  createUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<CreatedUserDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as CreateUserRequestDto;
    const result = await this.userService.createUser(payload);
    return sendSuccess(res, result, 'User created', StatusCodes.CREATED);
  });

  updateUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<UserUpdateResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UpdateUserRequestDto;
    const id = req.params.id.toString();
    const result = await this.userService.updateUser(id, payload);
    return sendSuccess(res, result, 'User updated', StatusCodes.OK);
  });

  assignGroups = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<boolean>>,
    _next: NextFunction
  ) => {
    const payload = req.body as AssignUserGroupsRequestDto;
    const id = req.params.id.toString();
    const result = await this.userService.assignGroups(id, payload);
    return sendSuccess(res, result, 'User groups assigned', StatusCodes.OK);
  });

  updateUserSettings = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UserSettingsDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UserSettingsDto;
    const result = await this.userService.updateSettings(req.user.userId, payload);
    return sendSuccess(res, result, 'User settings updated', StatusCodes.OK);
  });



  deleteUser = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    const id = req.params.id.toString();
    await this.userService.deleteUser(id);
    return sendSuccess(res, null, 'User deleted', StatusCodes.OK);
  });

   //TODO: Bkav HoanNTh: đặt lại tên hàm
   // Bkav VinhTQ: Done
  deleteCurrentUser = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    await this.userService.deleteUser(req.user.userId);
    return sendSuccess(res, null, 'Account deleted', StatusCodes.OK);
  });

}

export const userController = new UserController(userService);
