import { randomUUID } from 'node:crypto';
import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import AppError from '../utils/app-error.js';
import { SendMessageRequestDto } from '../types/message.type.js';



export class MessageService {
  private readonly conversationRepo: ConversationRepository;
  private readonly userRepo: UserRepository;


  constructor(
    conversationRepo: ConversationRepository,
    userRepo: UserRepository
  ) {
    this.conversationRepo = conversationRepo;
    this.userRepo = userRepo;
  }

  /**
   * Chuẩn bị dữ liệu cho luồng chat: kiểm tra quyền sở hữu conversation, tạo conversation nếu cần,
   * tạo conversation nếu cần và chuẩn bị metadata để gọi Flowise.
   */
  async prepareMessageStream(
    userId: string,
    payload: SendMessageRequestDto,
    conversationId?: string,
  ) {

    let targetConversationId: string | null ;
    let chatId: string | null;
    let sessionId: string | null;

    if (conversationId) {
      const conversation = await this.conversationRepo.getByIdAndUserId(conversationId, userId);
      if (!conversation) {
        throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
      }

      targetConversationId = conversation.id;
      chatId = conversation.chatId;
      sessionId = conversation.sessionId;

    } else {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND);

       const newConversation = await this.conversationRepo.create({
        userId,
        title: payload.title?.trim() || payload.question.slice(0, 50),
        modelName: payload.modelName,
      });
      targetConversationId = newConversation.id;
      chatId = null;
      sessionId = null;
    }

    return {
      conversationId: targetConversationId,
      chatId: chatId,
      sessionId: sessionId,
      userMessage: {
        id: randomUUID(),
        content: payload.question,
        senderType: 'user',
        modelName: payload.modelName,
        createdAt: new Date(),
      },
    };
  }
}



export const messageService = new MessageService(
  conversationRepository,
  userRepository
);
