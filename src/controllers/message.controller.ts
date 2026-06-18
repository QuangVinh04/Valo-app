import { randomUUID } from 'node:crypto';
import { NextFunction, Response } from 'express';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { MessageService, messageService } from '../services/message.service.js';
import { SendMessageRequestDto } from '../types/message.type.js';
import env from '../config/env.js';
import logger from '../utils/logger.util.js';
import { AiModelKey } from '../constants/ai-model.constant.js';
import { ConversationService, conversationService } from '../services/conversation.service.js';
import {
  DocumentFileService,
  documentFileService,
} from '../services/file.service.js';
import {
  AttachmentRepository,
  attachmentRepository,
} from '../repositories/attachment.repository.js';



export class MessageController {
  private readonly messageService: MessageService;
  private readonly conversationService: ConversationService;
  private readonly documentFileService: DocumentFileService;
  private readonly attachmentRepo: AttachmentRepository;
  private readonly aiService: AiService;

  constructor(
    messageService: MessageService,
    conversationService: ConversationService,
    documentFileService: DocumentFileService,
    attachmentRepo: AttachmentRepository,
    aiService: AiService
  ) {
    this.messageService = messageService;
    this.conversationService = conversationService;
    this.documentFileService = documentFileService;
    this.attachmentRepo = attachmentRepo;
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
    let chatId: string | undefined;
    let sessionId: string | undefined;

    const handleClientClose = () => {
      abortController.abort();
    };

    try {

      res.on('close', handleClientClose);

      const incomingFiles = payload.fileUploads ?? [];

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
        userMessage: {
          ...prepared.userMessage,
          fileUploads: incomingFiles,
        },
      })}\n\n`);


      const processedFiles = await this.documentFileService.processFilesFromUrls(incomingFiles);
      await this.attachmentRepo.createMany(
        userId,
        processedFiles.documents
      );



      const promptContext = payload.fileContext || processedFiles.promptContext;
      const aiQuestion = promptContext
        ? [
          prepared.userMessage.content,
          '',
          '[FILE TÀI LIỆU CỦA USER]',
          promptContext,
        ].join('\n')
        : prepared.userMessage.content;



      for await (const chunk of this.aiService.stream(
        aiQuestion,
        payload.modelName as AiModelKey,
        {
          conversationId: prepared.conversationId,
          chatId: prepared.chatId,
          sessionId: prepared.sessionId,
          fileUploads: incomingFiles,
          signal: abortController.signal
        }
      )) {
        // Nếu client đã hủy giữa chừng, dừng vòng lặp ngay
        if (abortController.signal.aborted) break;

        if (chunk.content !== undefined && chunk.content !== '') {
          chunks.push(chunk.content);

          res.write(`event: token\n`);
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`); // [INDEX]
        }

        if (chunk.chatId) chatId = chunk.chatId;
        if (chunk.sessionId) sessionId = chunk.sessionId;

      }


      // Go bo lang nghe su kien de tranh memory leak neu client da huy
      res.off('close', handleClientClose);


      //Nếu client đã hủy thì không làm gì tiếp theo nữa, không lưu DB
      if (abortController.signal.aborted) {
        res.end();
        return;
      }

      const finalContent = chunks.join('');

      if (chatId && sessionId) {
        await this.conversationService.updateConversation(
          userId,
          prepared.conversationId,
          {
            chatId,
            sessionId,
          }
        );
      }

      const assistantMessage = {
        id: randomUUID(),
        content: finalContent,
        senderType: 'assistant',
        modelName: payload.modelName,
        createdAt: new Date(),
      };

      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify({
        conversationId: prepared.conversationId,
        chatId: chatId,
        sessionId: sessionId,
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

export const messageController = new MessageController(
  messageService,
  conversationService,
  documentFileService,
  attachmentRepository,
  new AiService()
);
