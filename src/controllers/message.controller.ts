import { NextFunction, Response } from 'express';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { MessageService, messageService } from '../services/message.service.js';
import { SendMessageRequestDto } from '../types/message.type.js';
import logger from '../utils/logger.util.js';
import { AiModelKey } from '../constants/ai-model.constant.js';
import {
  FileService,
} from '../services/file.service.js';
import {
  AttachmentService,
  attachmentService,
} from '../services/attachment.service.js';



export class MessageController {
  private readonly messageService: MessageService;
  private readonly fileService: FileService;
  private readonly attachmentService: AttachmentService;
  private readonly aiService: AiService;

  constructor(
    messageService: MessageService,
    fileService: FileService,
    
    attachmentService: AttachmentService,
    aiService: AiService
  ) {
    this.messageService = messageService;
    this.fileService = fileService;
    //TODO: Bkav HoanNTh sai kiến trúc
    //FIXME: Bkav VinhTQ: Done
    this.attachmentService = attachmentService;
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

      const incomingFiles = payload.fileUploads ?? [];

      const prepared = await this.messageService.prepareMessageStream(
        userId,
        payload,
        conversationId
      );
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(`event: ready\n`);
      res.write(
        `data: ${JSON.stringify({
          conversationId: prepared.conversationId,
          userMessage: {
            ...prepared.userMessage,
            fileUploads: incomingFiles
          }
        })}\n\n`
      );

      const processedFiles = await this.fileService.processFilesFromUrls(incomingFiles);
      //TODO: Bkav HoanNTh: controller gọi thẳng repo, sai kiến trúc Controller → Service → Repository
      //FIXME: Bkav VinhTQ: Done
      await this.attachmentService.saveMessageAttachments(
        userId,
        processedFiles.documents,
        prepared.userMessage.id
      );

      const aiQuestion = this.messageService.buildAiQuestion(
        prepared.userMessage.content,
        payload.fileContext,
        processedFiles.documents
      );

      for await (const chunk of this.aiService.stream(aiQuestion, payload.modelName as AiModelKey, {
        history: prepared.history,
        fileUploads: incomingFiles,
        signal: abortController.signal
      })) {
        // Nếu client đã hủy giữa chừng, dừng vòng lặp ngay
        if (abortController.signal.aborted) break;

        if (chunk.content !== undefined && chunk.content !== '') {
          chunks.push(chunk.content);

          res.write(`event: token\n`);
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`); // [INDEX]
        }
      }

      // Go bo lang nghe su kien de tranh memory leak neu client da huy
      res.off('close', handleClientClose);

      // Nếu client đã hủy giữa chừng, vẫn lưu phần AI đã stream được để lịch sử không bị mất.
      if (abortController.signal.aborted) {
        const partialContent = chunks.join('').trim();
        if (partialContent) {
          await this.messageService.saveAssistantMessage(
            prepared.conversationId,
            partialContent,
            payload.modelName
          );
        }

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
      res.write(
        `data: ${JSON.stringify({
          conversationId: prepared.conversationId,
          assistantMessage
        })}\n\n`
      );

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
      })}\n\n`);
      res.end();
    }
  };
}

export const messageController = new MessageController(
  messageService,
  new FileService(),
  attachmentService,
  new AiService()
);
