import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { MessageRepository, messageRepository, type MessageStatus } from '../repositories/message.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { MessageResponseDto, SendMessageRequestDto } from '../types/message.type.js';
import { AiChatMessage } from './ai/ai-provider.js';
import type { ProcessedDocument } from './file.service.js';
import { MessageMapper } from '../mapper/message.mapper.js';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { Message } from '@prisma/client';
import { withTransaction } from '../database/transaction.js';
import { ROOT_PARENT_ID } from '../constants/message.constant.js';

const maxPromptContextChars = 30000;

export type ExportMessageDocxResult = {
  fileName: string;
  buffer: Buffer;
};

export type PreparedMessageStream = {
  conversationId: string;
  history: AiChatMessage[];
  userMessage: MessageResponseDto;
  assistantMessage: MessageResponseDto;
};

export interface CreateServiceMessageInput {
  conversationId: string;
  content: string;
  senderType: 'user' | 'assistant' | 'system';
  parentMessageId: string;
  status?: MessageStatus;
  modelName?: string | null;
}

export class MessageService {
  private readonly conversationRepo: ConversationRepository;
  private readonly userRepo: UserRepository;
  private readonly messageRepo: MessageRepository;

  constructor(
    conversationRepo: ConversationRepository,
    userRepo: UserRepository,
    messageRepo: MessageRepository
  ) {
    this.conversationRepo = conversationRepo;
    this.userRepo = userRepo;
    this.messageRepo = messageRepo;
  }

  /**
   * Chuẩn bị dữ liệu cho luồng chat: kiểm tra quyền sở hữu conversation, tạo conversation nếu cần,
   * lưu tin nhắn user ở trạng thái SUCCESS, tạo tin nhắn assistant PENDING
   * và chuẩn bị metadata/context để gọi AI.
   */
  async prepareMessageStream(
    userId: string,
    payload: SendMessageRequestDto,
    conversationId?: string
  ): Promise<PreparedMessageStream> {
    let history: AiChatMessage[] = [];
    let targetConversationId: string;

    const parentMessageId = payload.parentMessageId || ROOT_PARENT_ID;

    if (conversationId) {
      const conversation = await this.conversationRepo.getByIdAndUserId(conversationId, userId);
      if (!conversation) {
        throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
      }

      //TODO: Bkav HoanNTh: dùng singleton
      // Bkav VinhTQ: Done
      targetConversationId = conversation.id;
      if (payload.retryMessageId) {
        const retryMessage = await this.messageRepo.findById(payload.retryMessageId);
        if (
          !retryMessage
          || retryMessage.conversationId !== targetConversationId
          || retryMessage.senderType !== 'assistant'
        ) {
          throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
        }

        const userMessage = await this.messageRepo.findById(retryMessage.parentMessageId);
        if (!userMessage || userMessage.conversationId !== targetConversationId || userMessage.senderType !== 'user') {
          throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
        }

        const history = await this.buildBranchHistory(userMessage.id, userMessage.ancestors);
        const assistantMessage = await this.createMessage({
          conversationId: targetConversationId,
          content: '',
          senderType: 'assistant',
          parentMessageId: userMessage.id,
          status: 'PENDING',
          modelName: payload.modelName
        });

        return {
          conversationId: targetConversationId,
          history,
          userMessage: MessageMapper.toMessageResponse(userMessage),
          assistantMessage: MessageMapper.toMessageResponse(assistantMessage)
        };
      }

      if (parentMessageId !== ROOT_PARENT_ID) {
        const parentMessage = await this.messageRepo.findById(parentMessageId);
        if (!parentMessage) throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
        history = await this.buildBranchHistory(parentMessageId, parentMessage.ancestors);
      }
    } else {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND);

      const newConversation = await this.conversationRepo.create({
        userId,
        title: payload.title?.trim() || payload.question.slice(0, 50),
        modelName: payload.modelName
      });
      targetConversationId = newConversation.id;
    }

    const userMessage = await this.createMessage({
      conversationId: targetConversationId,
      content: payload.question,
      senderType: 'user',
      parentMessageId: parentMessageId,
      status: 'SUCCESS',
      modelName: payload.modelName
    });

    const assistantMessage = await this.createMessage({
      conversationId: targetConversationId,
      content: '',
      senderType: 'assistant',
      parentMessageId: userMessage.id,
      status: 'PENDING',
      modelName: payload.modelName
    });

    return {
      conversationId: targetConversationId,
      history,
      userMessage: MessageMapper.toMessageResponse(userMessage),
      assistantMessage: MessageMapper.toMessageResponse(assistantMessage)
    };
  }

  async updateAssistantMessage(
    messageId: string,
    content: string,
    status: MessageStatus,
    isUserStopped = false
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepo.updateContentAndStatus(
      messageId,
      content,
      status,
      isUserStopped
    );

    return MessageMapper.toMessageResponse(message);
  }

  buildAiQuestion(
    question: string,
    fileContext: string | undefined,
    documents: ProcessedDocument[]
  ): string {
    const promptContext = fileContext || this.createFilePromptContext(documents);

    return promptContext
      ? [question, '', '[FILE TÀI LIỆU CỦA USER]', promptContext].join('\n')
      : question;
  }

  private async buildBranchHistory(
    targetMessageId: string,
    ancestorIds: string[]
  ): Promise<AiChatMessage[]> {
    const recentBranchMessages = await this.messageRepo.findRecentBranchHistory(
      targetMessageId,
      ancestorIds,
      10
    );

    return recentBranchMessages.flatMap((message): AiChatMessage[] => {
      if (
        message.senderType !== 'system'
        && message.senderType !== 'user'
        && message.senderType !== 'assistant'
      ) {
        return [];
      }

      return [{ role: message.senderType, content: message.content }];
    });
  }

  private async createMessage(input: CreateServiceMessageInput): Promise<Message> {
    return await withTransaction(async (tx) => {
      const messageRepo = new MessageRepository(tx);
      const conversationRepo = new ConversationRepository(tx);

      let ancestorIds: string[] = [];

      // 1. Xử lý logic cây thư mục (Materialized Paths)
      if (input.parentMessageId && input.parentMessageId !== ROOT_PARENT_ID) {
        const parentAncestors = await messageRepo.findAncestorIds(input.parentMessageId);

        // Enterprise Rule: Dữ liệu đầu vào không hợp lệ phải chặn đứng và báo lỗi ngay lập tức
        if (!parentAncestors) {
          throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
        }

        ancestorIds = [...parentAncestors, input.parentMessageId];
      }

      // 3. Chuẩn bị dữ liệu sạch để nạp vào Repository
      const message = await messageRepo.create({
        conversationId: input.conversationId,
        content: input.content,
        senderType: input.senderType,
        parentMessageId: input.parentMessageId,
        ancestors: ancestorIds,
        status: input.status,
        modelName: input.modelName ?? null,
        isUserStopped: false
      });

      // 4. Đồng bộ cập nhật trạng thái bảng liên quan (Side-effect)
      await conversationRepo.updateTimestamp(input.conversationId);

      return message;
    });
  }

  async getConversationMessages(conversationId: string): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepo.findManyByConversationId(conversationId);

    return messages.map((message) => MessageMapper.toMessageResponse(message));
  }

  async exportMessageToDocx(userId: string, messageId: string): Promise<ExportMessageDocxResult> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
    }
    const conversation = await this.conversationRepo.getByIdAndUserId(
      message.conversationId,
      userId
    );
    if (!conversation) {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    if (message.senderType !== 'assistant') {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: conversation.title || 'Message Export',
              heading: HeadingLevel.TITLE
            }),

            ...this.markdownToDocxParagraphs(message.content || '')
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    return {
      fileName: this.sanitizeExportFileName(conversation.title || 'Message Export'),
      buffer
    };
  }

  private sanitizeExportFileName(fileName: string): string {
    const sanitized = Array.from(fileName, (char) =>
      char.charCodeAt(0) <= 31 || '<>:"/\\|?*'.includes(char) ? '-' : char
    )
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    return sanitized || 'Message Export';
  }

  private markdownToDocxParagraphs(content: string): Paragraph[] {
    const lines = content.split('\n');
    const paragraphs: Paragraph[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // Heading kiểu **Bước 1: ...**
      const boldHeading = line.match(/^\*\*(.+)\*\*$/);
      if (boldHeading) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: boldHeading[1],
                bold: true,
                size: 28
              })
            ],
            spacing: { before: 240, after: 120 }
          })
        );
        continue;
      }

      // Bullet: "- abc" hoặc "* abc"
      if (line.startsWith('- ') || line.startsWith('* ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            bullet: { level: 0 },
            spacing: { after: 100 }
          })
        );
        continue;
      }

      // Dòng có **bold** bên trong
      const parts = line.split(/(\*\*[^*]+\*\*)/g);

      paragraphs.push(
        new Paragraph({
          children: parts.map((part) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return new TextRun({
                text: part.slice(2, -2),
                bold: true
              });
            }

            return new TextRun({
              text: part
            });
          }),
          spacing: { after: 120 }
        })
      );
    }

    return paragraphs;
  }

  private createFilePromptContext(documents: ProcessedDocument[]): string {
    const context = documents
      .map((document, index) =>
        [
          `File ${index + 1}: ${document.name}`,
          `MIME: ${document.mime}`,
          ...(document.url ? [`URL: ${document.url}`] : []),
          'Content:',
          document.text || '[No readable text found]'
        ].join('\n')
      )
      .join('\n\n---\n\n');

    return this.truncateText(context, maxPromptContextChars);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n[Content truncated]`;
  }
}

export const messageService = new MessageService(
  conversationRepository,
  userRepository,
  messageRepository
);
