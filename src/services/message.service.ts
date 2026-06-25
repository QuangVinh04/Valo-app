import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { MessageRepository, messageRepository } from '../repositories/message.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { MessageResponseDto, SendMessageRequestDto } from '../types/message.type.js';
import { AiChatMessage } from './ai/ai-provider.js';
import type { ProcessedDocument } from './file.service.js';
import { MessageMapper } from '../mapper/message.mapper.js';


const maxPromptContextChars = 30000;

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
