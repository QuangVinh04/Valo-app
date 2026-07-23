import { NextFunction, Response } from 'express';
import { conversationService, ConversationService } from '../services/conversation.service.js';
import catchAsync from '../utils/catch-async.js';
import { ApiResponse, sendSuccess } from '../utils/api-response.js';
import {
  ConversationDetailResponseDto,
  ConversationSummaryResponseDto,
  ConversationUpdateResponseDto,
  CreateConversationRequestDto,
  UpdateConversationRequestDto
} from '../types/conversation.type.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { StatusCodes } from 'http-status-codes';
import { getCursorPaginationOptions } from '../utils/pagination.util.js';

export class ConversationController {
  private conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    this.conversationService = conversationService;
  }

  createConversation = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response<ApiResponse<ConversationDetailResponseDto>>,
      _next: NextFunction
    ) => {
      const userId = req.user.userId;
      const payload = req.body as CreateConversationRequestDto;
      const result = await this.conversationService.createNewConversation(userId!, payload);
      return sendSuccess(res, result, 'Conversation created successfully', StatusCodes.CREATED);
    }
  );

  getConversationById = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response<ApiResponse<ConversationDetailResponseDto>>,
      _next: NextFunction
    ) => {
      const id = req.params.id.toString();
      const result = await this.conversationService.getConversationById(req.user.userId, id);
      return sendSuccess(res, result, 'Conversation found', StatusCodes.OK);
    }
  );

  updateConversation = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response<ApiResponse<ConversationUpdateResponseDto>>,
      _next: NextFunction
    ) => {
      const id = req.params.id.toString();
      const payload = req.body as UpdateConversationRequestDto;
      const result = await this.conversationService.updateConversation(
        req.user.userId,
        id,
        payload
      );
      return sendSuccess(res, result, 'Conversation updated successfully', StatusCodes.OK);
    }
  );

  deleteConversation = catchAsync(
    async (req: AuthenticatedRequest, res: Response<ApiResponse<null>>, _next: NextFunction) => {
      const id = req.params.id.toString();
      await this.conversationService.deleteConversation(req.user.userId, id);
      return sendSuccess(res, null, 'Conversation deleted successfully', StatusCodes.OK);
    }
  );

  clearMyConversations = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response<ApiResponse<{ deletedCount: number }>>,
      _next: NextFunction
    ) => {
      const deletedCount = await this.conversationService.clearUserConversations(req.user.userId);
      return sendSuccess(
        res,
        { deletedCount },
        'Chat history cleared successfully',
        StatusCodes.OK
      );
    }
  );

  //TODO: Bkav HoanNTh: đặt tên hàm chưa tường minh
  // Bkav VinhTQ: Done
  getConversations = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response<ApiResponse<ConversationSummaryResponseDto[]>>,
      _next: NextFunction
    ) => {
      const userId = req.user.userId;
      const pagination = getCursorPaginationOptions(req.query);
      const search =
        typeof req.query.search === 'string' && req.query.search.trim()
          ? req.query.search.trim().slice(0, 200)
          : undefined;
      const result = await this.conversationService.getConversations(userId, pagination, search);
      return sendSuccess(res, result.data, 'Conversations found', StatusCodes.OK, result.meta);
    }
  );
}

export const conversationController = new ConversationController(conversationService);
