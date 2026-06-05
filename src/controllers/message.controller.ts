import { NextFunction, Response } from 'express';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import MessageService from '../services/message.service.js';
import { SendMessageRequestDto } from '../types/message.type.js';
import env from '../config/env.js';
import logger from '../utils/logger.util.js';
import { AiModelKey } from '../constants/ai-model.constant.js';

export class MessageController {
  private readonly messageService: MessageService;
  private readonly aiService: AiService;

  constructor(messageService: MessageService, aiService: AiService) {
    this.messageService = messageService;
    this.aiService = aiService;
  }

  sendMessageStream = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user.userId;
    const conversationId = req.params.id?.toString();
    const payload = req.body as SendMessageRequestDto;
    const abortController = new AbortController();

    const chunks: string[] = [];  // Lưu trữ các chunk tạm thời để có thể lưu vào DB sau khi stream kết thúc

    const handleClientClose = () => {
      abortController.abort();
    };

    try {

      res.on('close', handleClientClose);

      const prepared = await this.messageService.prepareMessageStream(
          userId,
          payload,
          conversationId
        )

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(`event: ready\n`);
      res.write(`data: ${JSON.stringify({
        conversationId: prepared.conversationId,
        userMessage: prepared.userMessage,
      })}\n\n`);

      for await (const chunk of this.aiService.stream(
        prepared.context,
        payload.modelName as AiModelKey,
        abortController.signal
      )) {
        // Nếu client đã hủy giữa chừng, dừng vòng lặp ngay
        if (abortController.signal.aborted) break;

        chunks.push(chunk);

        res.write(`event: token\n`);
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }


      // Go bo lang nghe su kien de tranh memory leak neu client da huy
      res.off('close', handleClientClose);


      //Nếu client đã hủy thì không làm gì tiếp theo nữa, không lưu DB
      if (abortController.signal.aborted) {
        res.end();
        return;
      }
      
      const finalContent = chunks.join('');

      const assistantMessage = await this.messageService.saveAssistantMessage(
        prepared.conversationId,
        finalContent,
        payload.modelName
      );

      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify({
        conversationId: prepared.conversationId,
        assistantMessage,
      })}\n\n`);

    
      res.end();

    } catch (error) {
      logger.error('Message stream failed', {
        error,
        userId,
        conversationId,
        modelName: payload.modelName,
      });

      if (!res.headersSent) {
        next(error);
        return;
      }

      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        message: 'Stream failed',
        detail: env.NODE_ENV === 'production' ? undefined : this.getErrorMessage(error),
      })}\n\n`);
      res.end();
    }
  };

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown stream error';
  }
}

export default MessageController;
