import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { groupService, GroupService } from '../services/group.service.js';
import type {
  GroupMembersRequestDto,
  GroupRequestDto,
  GroupResponseDto,
  UpdateGroupRequestDto,
  GroupMemberDto,
  CreatedGroupDto,
  GroupListItemDto,
  UpdateGroupResponseDto,
  BulkDeleteGroupsRequestDto,
  BulkDeleteGroupsResponseDto
} from '../types/group.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getPaginationOptions } from '../utils/pagination.util.js';

export class GroupController {
  private readonly groupService: GroupService;

  constructor(groupService: GroupService) {
    this.groupService = groupService;
  }

  //TODO: Bkav HoanNTh: đặt tên hàm chưa tường minh
  //FIXME: Bkav VinhTQ: Done
  getGroups = catchAsync(
    async (req: Request, res: Response<ApiResponse<GroupListItemDto[]>>, _next: NextFunction) => {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const result = await this.groupService.getGroups(getPaginationOptions(req.query), { search });
      return sendSuccess(res, result.data, 'Groups found', StatusCodes.OK, result.meta);
    }
  );

  getGroupById = catchAsync(
    async (req: Request, res: Response<ApiResponse<GroupResponseDto>>, _next: NextFunction) => {
      const id = req.params.id.toString();
      const result = await this.groupService.getGroupById(id);
      return sendSuccess(res, result, 'Group found', StatusCodes.OK);
    }
  );

  createGroup = catchAsync(
    async (req: Request, res: Response<ApiResponse<CreatedGroupDto>>, _next: NextFunction) => {
      const payload = req.body as GroupRequestDto;
      const result = await this.groupService.createGroup(payload);
      return sendSuccess(res, result, 'Group created', StatusCodes.CREATED);
    }
  );

  updateGroup = catchAsync(
    async (
      req: Request,
      res: Response<ApiResponse<UpdateGroupResponseDto>>,
      _next: NextFunction
    ) => {
      const payload = req.body as UpdateGroupRequestDto;
      const id = req.params.id.toString();
      const result = await this.groupService.updateGroup(id, payload);
      return sendSuccess(res, result, 'Group updated', StatusCodes.OK);
    }
  );

  deleteGroup = catchAsync(
    async (req: Request, res: Response<ApiResponse<null>>, _next: NextFunction) => {
      const id = req.params.id.toString();
      await this.groupService.deleteGroup(id);
      return sendSuccess(res, null, 'Group deleted', StatusCodes.OK);
    }
  );

  deleteGroups = catchAsync(
    async (req: Request, res: Response<ApiResponse<BulkDeleteGroupsResponseDto>>, _next: NextFunction) => {
      const payload = req.body as BulkDeleteGroupsRequestDto;
      const result = await this.groupService.deleteGroups(payload.ids);
      return sendSuccess(res, result, 'Groups deleted', StatusCodes.OK);
    }
  );

  getGroupMembers = catchAsync(
    async (req: Request, res: Response<ApiResponse<GroupMemberDto>>, _next: NextFunction) => {
      const id = req.params.id.toString();
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined || search !== undefined;
      const result = shouldPaginate
        ? await this.groupService.getGroupMembers(id, getPaginationOptions(req.query), { search })
        : await this.groupService.getGroupMembers(id);

      if ('data' in result) {
        return sendSuccess(res, result.data, 'Group members found', StatusCodes.OK, result.meta);
      }

      return sendSuccess(res, result, 'Group members found', StatusCodes.OK);
    }
  );

  addGroupMembers = catchAsync(
    async (req: Request, res: Response<ApiResponse<GroupMemberDto>>, _next: NextFunction) => {
      const payload = req.body as GroupMembersRequestDto;
      const id = req.params.id.toString();
      const result = await this.groupService.addMembers(id, payload.userIds);
      return sendSuccess(res, result, 'Members added to group', StatusCodes.OK);
    }
  );

  removeGroupMembers = catchAsync(
    async (req: Request, res: Response<ApiResponse<GroupMemberDto>>, _next: NextFunction) => {
      const payload = req.body as GroupMembersRequestDto;
      const id = req.params.id.toString();
      const result = await this.groupService.removeMembers(id, payload.userIds);
      return sendSuccess(res, result, 'Members removed from group', StatusCodes.OK);
    }
  );
}

export const groupController = new GroupController(groupService);
