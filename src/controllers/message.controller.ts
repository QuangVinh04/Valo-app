import { NextFunction, Response } from 'express';
import AiService from '../services/ai.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { MessageService, messageService } from '../services/message.service.js';
import { SendMessageRequestDto } from '../types/message.type.js';
import logger from '../utils/logger.util.js';
import catchAsync from '../utils/catch-async.js';
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
    let pendingAssistantMessageId: string | undefined;

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
      pendingAssistantMessageId = prepared.assistantMessage.id;

      // File đã gửi thuộc về user message ngay khi request được chấp nhận.
      // Việc trích xuất nội dung phía sau có thể thất bại nhưng không được làm mất attachment.
      await this.attachmentService.saveMessageAttachments(
        userId,
        incomingFiles,
        prepared.userMessage.id
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
            fileUploads: incomingFiles.length
              ? incomingFiles
              : prepared.userMessage.fileUploads
          },
          assistantMessage: prepared.assistantMessage
        })}\n\n`
      );

      const processedFiles = await this.fileService.processFilesFromUrls(incomingFiles);

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
        await this.messageService.updateAssistantMessage(
          prepared.assistantMessage.id,
          chunks.join(''),
          'SUCCESS',
          true
        );

        res.end();
        return;
      }

      const finalContent = chunks.join('');

      const assistantMessage = await this.messageService.updateAssistantMessage(
        prepared.assistantMessage.id,
        finalContent,
        'SUCCESS'
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
      res.off('close', handleClientClose);

      // Client có thể dừng stream trong lúc backend vẫn đang tải hoặc trích xuất file.
      // Khi đó lỗi phát sinh sau tín hiệu abort không được ghi đè trạng thái chủ động dừng.
      if (abortController.signal.aborted) {
        if (pendingAssistantMessageId) {
          await this.messageService.updateAssistantMessage(
            pendingAssistantMessageId,
            chunks.join(''),
            'SUCCESS',
            true
          ).catch((saveError) => {
            logger.error('Failed to persist stopped assistant message', {
              error: saveError,
              userId,
              conversationId,
              modelName: payload.modelName,
            });
          });
        }

        return;
      }

      logger.error('Message stream failed', {
        error,
        userId,
        conversationId,
        modelName: payload.modelName,
      });

      if (pendingAssistantMessageId) {
        await this.messageService.updateAssistantMessage(
          pendingAssistantMessageId,
          getFailedAssistantContent(chunks, error),
          'FAILED'
        ).catch((saveError) => {
          logger.error('Failed to update assistant message status', {
            error: saveError,
            userId,
            conversationId,
            modelName: payload.modelName,
          });
        });
      }

      if (!res.headersSent) {
        next(error);
        return;
      }

      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        message: getStreamErrorMessage(error),
      })}\n\n`);
      res.end();
    }
  };

  exportMessageDocx = catchAsync(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction,
    ) => {
      const userId = req.user.userId;
      const messageId = req.params.messageId as string

      const result = await this.messageService.exportMessageToDocx(
        userId,
        messageId
      )
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      const fileName = `${result.fileName}.docx`;
      const encodedFileName = encodeURIComponent(fileName);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="message-export.docx"; filename*=UTF-8''${encodedFileName}`
      );

      res.send(result.buffer);
    }
  )
}

export const messageController = new MessageController(
  messageService,
  new FileService(),
  attachmentService,
  new AiService()
);

function getStreamErrorMessage(error: unknown): string {
  if (
    error instanceof Error
    && typeof error === 'object' && 'isOperational' in error
    && (error as { isOperational?: boolean }).isOperational
  ) {
    return error.message;
  }

  return 'Unable to generate a response from AI. Please try again.';
}

function getFailedAssistantContent(chunks: string[], error?: unknown): string {
  const partialContent = chunks.join('').trim();

  return partialContent || getStreamErrorMessage(error);
}
