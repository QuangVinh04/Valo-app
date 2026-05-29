import { ConversationRepository } from '../repositories/conversation.repository.js';
import MessageRepository from '../repositories/message.repository.js';
import UserRepository from '../repositories/user.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import AppError from '../utils/app-error.js';
import { SendMessageResponseDto } from '../types/message.type.js';

export class MessageService {
  private readonly conversationRepo: ConversationRepository;
  private readonly userRepo: UserRepository;

  constructor(conversationRepo: ConversationRepository, userRepo: UserRepository) {
    this.conversationRepo = conversationRepo;
    this.userRepo = userRepo;
  }

  async sendMessage(userId: string, payload: { conversationId: string; content: string; modelName: string }): Promise<SendMessageResponseDto> {
    const conversation = await this.conversationRepo.getById(payload.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    return withTransaction(async (tx) => {
      const messageRepo = new MessageRepository(tx);
      const conversationRepo = new ConversationRepository(tx);

      const userMessage = await messageRepo.create({
        conversationId: payload.conversationId,
        content: payload.content,
        senderType: 'user',
        modelName: payload.modelName,
      });

      const assistantMessage = await messageRepo.create({
        conversationId: payload.conversationId,
        content: `Echo: ${payload.content}`,
        senderType: 'assistant',
        modelName: payload.modelName,
      });

      return {
        conversationId: payload.conversationId,
        userMessage,
        assistantMessage,
      };
    });
  }

  async sendMessageAutoConversation(userId: string, payload: { conversationId?: string; title?: string; content: string; modelName: string }): Promise<SendMessageResponseDto> {
    if (payload.conversationId) {
      return this.sendMessage(userId, {
        conversationId: payload.conversationId,
        content: payload.content,
        modelName: payload.modelName,
      });
    }

    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND);

    return withTransaction(async (tx) => {
      const conversationRepo = new ConversationRepository(tx);
      const messageRepo = new MessageRepository(tx);

      const createdConversation = await conversationRepo.create({
        userId,
        title: payload.title?.trim() || payload.content.slice(0, 50),
        modelName: payload.modelName,
      });

      const userMessage = await messageRepo.create({
        conversationId: createdConversation.id,
        content: payload.content,
        senderType: 'user',
        modelName: payload.modelName,
      });

      const assistantMessage = await messageRepo.create({
        conversationId: createdConversation.id,
        content: `Echo: ${payload.content}`,
        senderType: 'assistant',
        modelName: payload.modelName,
      });


      return {
        conversationId: createdConversation.id,
        userMessage,
        assistantMessage,
      };
    });
  }
}

export default MessageService;
