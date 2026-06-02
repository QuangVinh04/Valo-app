import { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import MessageService from '../services/message.service.js';
import { SendMessageRequestDto, SendMessageResponseDto } from '../types/message.type.js';
import { ApiResponse, sendSuccess } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';

export class MessageController {
  private readonly messageService: MessageService;
  private readonly aiService: AiService;

  constructor(messageService: MessageService, aiService: AiService) {
    this.messageService = messageService;
    this.aiService = aiService;
  }

  sendMessage = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SendMessageResponseDto>>,
    _next: NextFunction
  ) => {
    const userId = req.user.userId;
    const conversationId = req.params.id.toString();
    const payload = req.body as SendMessageRequestDto;
    const result = await this.messageService.sendMessage(userId, conversationId, payload);
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

  sendMessageStream = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user.userId;
    const conversationId = req.params.id.toString();
    const payload = req.body as SendMessageRequestDto;
    const abortController = new AbortController();
    let fullContent = '';

    try {
      const { userMessage, context } =
        await this.messageService.prepareMessageStream(
          userId,
          conversationId,
          payload
        );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.on('close', () => abortController.abort());

      res.write(`event: ready\n`);
      res.write(`data: ${JSON.stringify({ userMessage })}\n\n`);

      for await (const chunk of this.aiService.stream(
        context,
        payload.modelName,
        abortController.signal
      )) {
        fullContent += chunk;
        res.write(`event: token\n`);
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      if (abortController.signal.aborted) return;

      const assistantMessage = await this.messageService.saveAssistantMessage(
        conversationId,
        fullContent,
        payload.modelName
      );

      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify({ assistantMessage })}\n\n`);
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
        return;
      }

      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'Stream failed' })}\n\n`);
      res.end();
    }
  };
}

export default MessageController;
