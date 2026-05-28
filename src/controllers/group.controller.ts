import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GroupService } from '../services/group.service.js';
import type {
  GroupMembersRequestDto,
  GroupRequestDto,
  GroupResponseDto,
  UpdateGroupRequestDto
} from '../types/group.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getPaginationOptions } from '../utils/pagination.util.js';

export class GroupController {
  private readonly groupService: GroupService;

  constructor(groupService: GroupService) {
    this.groupService = groupService;
  }

  private getIdParam(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  private getUserIdParam(req: Request): string {
    const userId = req.params.userId;
    return Array.isArray(userId) ? userId[0] : userId;
  }

  list = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto[]>>,
    _next: NextFunction
  ) => {
    const result = await this.groupService.getGroups(getPaginationOptions(req.query));
    return sendSuccess(res, result.data, 'Groups found', StatusCodes.OK, result.meta);
  });

  getById = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const result = await this.groupService.getGroupById(this.getIdParam(req));
    return sendSuccess(res, result, 'Group found', StatusCodes.OK);
  });

  create = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as GroupRequestDto;
    const result = await this.groupService.createGroup(payload);
    return sendSuccess(res, result, 'Group created', StatusCodes.CREATED);
  });

  update = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UpdateGroupRequestDto;
    const result = await this.groupService.updateGroup(this.getIdParam(req), payload);
    return sendSuccess(res, result, 'Group updated', StatusCodes.OK);
  });

  delete = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    await this.groupService.deleteGroup(this.getIdParam(req));
    return sendSuccess(res, null, 'Group deleted', StatusCodes.OK);
  });


  addMembers = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as GroupMembersRequestDto;
    const result = await this.groupService.addMembers(this.getIdParam(req), payload.userIds);
    return sendSuccess(res, result, 'Members added to group', StatusCodes.OK);
  });



  removeMembers = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as GroupMembersRequestDto;
    const result = await this.groupService.removeMembers(this.getIdParam(req), payload.userIds);
    return sendSuccess(res, result, 'Members removed from group', StatusCodes.OK);
  });
}

export default GroupController;
