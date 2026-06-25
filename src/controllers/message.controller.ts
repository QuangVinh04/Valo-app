import { NextFunction, Response } from 'express';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { MessageService, messageService } from '../services/message.service.js';
import { SendMessageRequestDto } from '../types/message.type.js';
import logger from '../utils/logger.util.js';
import { AiModelKey } from '../constants/ai-model.constant.js';
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
  private readonly documentFileService: DocumentFileService;
  private readonly attachmentRepo: AttachmentRepository;
  private readonly aiService: AiService;

  constructor(
    messageService: MessageService,
    documentFileService: DocumentFileService,
    attachmentRepo: AttachmentRepository,
    aiService: AiService
  ) {
    this.messageService = messageService;
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
        processedFiles.documents,
        prepared.userMessage.id
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
          history: prepared.history,
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
      })}\n\n`);
      res.end();
    }
  };
}

export const messageController = new MessageController(
  messageService,
  documentFileService,
  attachmentRepository,
  new AiService()
);
