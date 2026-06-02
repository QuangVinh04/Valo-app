import { ConversationRepository } from '../repositories/conversation.repository.js';
import MessageRepository from '../repositories/message.repository.js';
import UserRepository from '../repositories/user.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import AppError from '../utils/app-error.js';
import { SendMessageRequestDto, SendMessageResponseDto } from '../types/message.type.js';
import { buildChatContext } from '../utils/chat-text.util.js';



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

  async sendMessage(
    userId: string,
    conversationId: string,
    payload: SendMessageRequestDto):
    Promise<SendMessageResponseDto> {
    const conversation = await this.conversationRepo.getById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    return withTransaction(async (tx) => {
      const messageRepo = new MessageRepository(tx);

      const userMessage = await messageRepo.create({
        conversationId,
        content: payload.content,
        senderType: 'user',
        modelName: payload.modelName,
      });

      const assistantMessage = await messageRepo.create({
        conversationId,
        content: `Echo: ${payload.content}`,
        senderType: 'assistant',
        modelName: payload.modelName,
      });

      return {
        conversationId,
        userMessage,
        assistantMessage,
      };
    });
  }

  async sendMessageAutoConversation(userId: string, payload: SendMessageRequestDto): Promise<SendMessageResponseDto> {
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

  async prepareMessageStream(
    userId: string,
    conversationId: string,
    payload: SendMessageRequestDto
  ) {
    const conversation = await this.conversationRepo.getById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    return withTransaction(async (tx) => {
      const messageRepo = new MessageRepository(tx);

      const userMessage = await messageRepo.create({
        conversationId,
        content: payload.content,
        senderType: 'user',
        modelName: payload.modelName,
      });

      // Lịch sử đã bao gồm userMessage vừa tạo
      const history = await messageRepo.findRecentByConversationId(
        conversationId,
        10
      );

      return {
        userMessage,
        context: buildChatContext(history),
      };
    });
  }

  async saveAssistantMessage(
    conversationId: string,
    content: string,
    modelName: string
  ) {
    return this.messageRepo.create({
      conversationId,
      content,
      senderType: 'assistant',
      modelName,
    });
  }
}

export default MessageService;
