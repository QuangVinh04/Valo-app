import { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { CreateMessageRequestDto, SendMessageRequestDto, SendMessageResponseDto } from '../types/conversation.type.js';
import { ApiResponse, sendSuccess } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import MessageService from '../services/message.service.js';

export class MessageController {
  private readonly messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  sendMessage = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SendMessageResponseDto>>,
    _next: NextFunction
  ) => {
    const userId = req.user.userId;
    const conversationId = req.params.id.toString();
    const payload = req.body as CreateMessageRequestDto;
    const result = await this.messageService.sendMessage(userId, {
      conversationId,
      content: payload.content,
      modelName: payload.modelName,
    });
    return sendSuccess(res, result, 'Message sent successfully', StatusCodes.OK);
  });

  sendMessageAuto = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SendMessageResponseDto>>,
    _next: NextFunction
  ) => {
    const userId = req.user.userId;
    const payload = req.body as SendMessageRequestDto;
    const result = await this.messageService.sendMessageAutoConversation(userId, payload);
    return sendSuccess(res, result, 'Message sent successfully', StatusCodes.OK);
  });
}

export default MessageController;
