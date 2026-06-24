import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { MessageRepository, messageRepository } from '../repositories/message.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { MessageResponseDto, SendMessageRequestDto } from '../types/message.type.js';
import { AiChatMessage } from './ai/ai-provider.js';



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
      userMessage: this.toMessageResponse(userMessage),
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

    return this.toMessageResponse(assistantMessage);
  }

  async getConversationMessages(conversationId: string): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepo.findManyByConversationId(conversationId);

    return messages.map((message) => this.toMessageResponse(message));
  }

  private toMessageResponse(message: {
    id: string;
    content: string;
    senderType: string;
    modelName: string | null;
    createdAt: Date;
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      fileUrl: string | null;
      fileSize: number | null;
    }>;
  }): MessageResponseDto {
    const fileUploads = message.attachments
      ?.filter((attachment) => attachment.fileUrl)
      .map((attachment) => ({
        data: attachment.fileUrl as string,
        name: attachment.fileName,
        type: 'url' as const,
        mime: attachment.mimeType,
        ...(typeof attachment.fileSize === 'number' ? { size: attachment.fileSize } : {}),
      }));

    return {
      id: message.id,
      content: message.content,
      senderType: message.senderType,
      modelName: message.modelName,
      createdAt: message.createdAt,
      ...(fileUploads?.length ? { fileUploads } : {}),
    };
  }
}



export const messageService = new MessageService(
  conversationRepository,
  userRepository,
  messageRepository
);
