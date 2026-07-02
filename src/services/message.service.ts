import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { MessageRepository, messageRepository } from '../repositories/message.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { MessageResponseDto, SendMessageRequestDto } from '../types/message.type.js';
import { AiChatMessage } from './ai/ai-provider.js';
import type { ProcessedDocument } from './file.service.js';
import { MessageMapper } from '../mapper/message.mapper.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';


const maxPromptContextChars = 30000;

export type ExportMessageDocxResult = {
  fileName: string;
  buffer: Buffer;
};

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
   * lưu tin nhắn user và chuẩn bị metadata/context để gọi AI.
   */
  async prepareMessageStream(
    userId: string,
    payload: SendMessageRequestDto,
    conversationId?: string,
  ) {

    let targetConversationId: string;
    let history: AiChatMessage[] = [];

    if (conversationId) {
      const conversation = await this.conversationRepo.getByIdAndUserId(conversationId, userId);
      if (!conversation) {
        throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
      }

      //TODO: Bkav HoanNTh: dùng singleton
      // Bkav VinhTQ: Done

      targetConversationId = conversation.id;
      const recentMessages = await this.messageRepo.findRecentByConversationId(targetConversationId, 10);
      history = recentMessages.flatMap((message): AiChatMessage[] => {
        if (
          message.senderType !== 'system'
          && message.senderType !== 'user'
          && message.senderType !== 'assistant'
        ) {
          return [];
        }

        return [{
          role: message.senderType,
          content: message.content,
        }];
      });

    } else {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND);

       const newConversation = await this.conversationRepo.create({
        userId,
        title: payload.title?.trim() || payload.question.slice(0, 50),
        modelName: payload.modelName,
      });
      targetConversationId = newConversation.id;
    }

    const userMessage = await this.messageRepo.create({
      conversationId: targetConversationId,
      content: payload.question,
      senderType: 'user',
      modelName: payload.modelName,
    });

    return {
      conversationId: targetConversationId,
      history,
      userMessage: MessageMapper.toMessageResponse(userMessage),
    };
  }

  async saveAssistantMessage(
    conversationId: string,
    content: string,
    modelName: string
  ): Promise<MessageResponseDto> {
    const assistantMessage = await this.messageRepo.create({
      conversationId,
      content,
      senderType: 'assistant',
      modelName,
    });

    return MessageMapper.toMessageResponse(assistantMessage);
  }

  buildAiQuestion(
    question: string,
    fileContext: string | undefined,
    documents: ProcessedDocument[]
  ): string {
    const promptContext = fileContext || this.createFilePromptContext(documents);

    return promptContext
      ? [
        question,
        '',
        '[FILE TÀI LIỆU CỦA USER]',
        promptContext,
      ].join('\n')
      : question;
  }

  async getConversationMessages(conversationId: string): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepo.findManyByConversationId(conversationId);

    return messages.map((message) => MessageMapper.toMessageResponse(message));
  }

  async exportMessageToDocx(userId: string, messageId: string): Promise<ExportMessageDocxResult> {
    const message = await this.messageRepo.findById(messageId);
    if(!message){
      throw new AppError(ErrorCode.MESSAGE_NOT_FOUND);
    }
    const conversation = await this.conversationRepo.getByIdAndUserId(
      message.conversationId,
      userId
    )
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

            ... this.markdownToDocxParagraphs(message.content || '')
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
    const sanitized = fileName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
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
                size: 28,
              }),
            ],
            spacing: { before: 240, after: 120 },
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
            spacing: { after: 100 },
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
                bold: true,
              });
            }

            return new TextRun({
              text: part,
            });
          }),
          spacing: { after: 120 },
        })
      );
    }

    return paragraphs;
  }

  private createFilePromptContext(documents: ProcessedDocument[]): string {
    const context = documents
      .map((document, index) => [
        `File ${index + 1}: ${document.name}`,
        `MIME: ${document.mime}`,
        ...(document.url ? [`URL: ${document.url}`] : []),
        'Content:',
        document.text || '[No readable text found]',
      ].join('\n'))
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
