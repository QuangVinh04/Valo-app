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
    const id = req.params.id.toString();
    const result = await this.groupService.getGroupById(id);
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
    const id = req.params.id.toString();
    const result = await this.groupService.updateGroup(id, payload);
    return sendSuccess(res, result, 'Group updated', StatusCodes.OK);
  });

  delete = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<null>>,
    _next: NextFunction
  ) => {
    const id = req.params.id.toString();
    await this.groupService.deleteGroup(id);
    return sendSuccess(res, null, 'Group deleted', StatusCodes.OK);
  });


  addMembers = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as GroupMembersRequestDto;
    const id = req.params.id.toString();
    const result = await this.groupService.addMembers(id, payload.userIds);
    return sendSuccess(res, result, 'Members added to group', StatusCodes.OK);
  });



  removeMembers = catchAsync(async (
    req: Request,
    res: Response<ApiResponse<GroupResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as GroupMembersRequestDto;
    const id = req.params.id.toString();
    const result = await this.groupService.removeMembers(id, payload.userIds);
    return sendSuccess(res, result, 'Members removed from group', StatusCodes.OK);
  });
}

export default GroupController;
