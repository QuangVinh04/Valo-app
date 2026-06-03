import { NextFunction, Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service.js';
import catchAsync from '../utils/catch-async.js';
import { ApiResponse, sendSuccess } from '../utils/api-response.js';
import { ConversationResponseDto, CreateConversationRequestDto, UpdateConversationRequestDto } from '../types/conversation.type.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { StatusCodes } from 'http-status-codes';
import { getPaginationOptions } from '../utils/pagination.util.js';

export class ConversationController {
    private conversationService: ConversationService;

    constructor(conversationService: ConversationService) {
        this.conversationService = conversationService;
    }


    create = catchAsync(async (
        req: AuthenticatedRequest,
        res: Response<ApiResponse<ConversationResponseDto>>,
        _next: NextFunction
    ) => {
        const userId = req.user.userId;
        const payload = req.body as CreateConversationRequestDto;
        const result = await this.conversationService.createNewConversation(userId!, payload);
        return sendSuccess(
            res,
            result,
            'Conversation created successfully',
            StatusCodes.CREATED
        )
    });

    getById = catchAsync(async (
        req: Request,
        res: Response<ApiResponse<ConversationResponseDto>>,
        _next: NextFunction
    ) => {
        const id = req.params.id.toString();
        const result = await this.conversationService.getConversationById(id);
        return sendSuccess(
            res, 
            result, 
            'Conversation found', 
            StatusCodes.OK);
    });

    update = catchAsync(async (
        req: Request,
        res: Response<ApiResponse<ConversationResponseDto>>,
        _next: NextFunction
    ) => {
        const id = req.params.id.toString();
        const payload = req.body as UpdateConversationRequestDto;
        const result = await this.conversationService.updateConversation(id, payload);
        return sendSuccess(
            res, 
            result, 
            'Conversation updated successfully', 
            StatusCodes.OK);
    });

    delete = catchAsync(async (
        req: Request,
        res: Response<ApiResponse<null>>,
        _next: NextFunction
    ) => {
        const id = req.params.id.toString();
        await this.conversationService.deleteConversation(id);
        return sendSuccess(
            res, 
            null, 
            'Conversation deleted successfully', 
            StatusCodes.OK);
    })

    clearMine = catchAsync(async (
        req: AuthenticatedRequest,
        res: Response<ApiResponse<{ deletedCount: number }>>,
        _next: NextFunction
    ) => {
        const deletedCount = await this.conversationService.clearUserConversations(req.user.userId);
        return sendSuccess(
            res,
            { deletedCount },
            'Chat history cleared successfully',
            StatusCodes.OK);
    });

    list = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<ConversationResponseDto[]>>,
    _next: NextFunction
  ) => {
    const userId = req.user.userId;
    const pagination = getPaginationOptions(req.query);
    const result = await this.conversationService.getConversations(userId, pagination);
    return sendSuccess(
        res, 
        result.data, 
        'Conversations found', 
        StatusCodes.OK, 
        result.meta);
  });
}
