import { ConversationRepository, conversationRepository } from '../repositories/conversation.repository.js';
import { MessageRepository, messageRepository } from '../repositories/message.repository.js';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { ErrorCode } from '../constants/error-code.js';
import { MessageMapper } from '../mapper/message.mapper.js';
import { withTransaction } from '../database/transaction.js';
import AppError from '../utils/app-error.js';
import { SendMessageRequestDto } from '../types/message.type.js';
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

  /**
   * Chuẩn bị dữ liệu cho luồng chat: kiểm tra quyền sở hữu conversation, tạo conversation nếu cần,
   * lưu tin nhắn người dùng và xây dựng context gần nhất cho AI.
   */
  async prepareMessageStream(
    userId: string,
    payload: SendMessageRequestDto,
    conversationId?: string,
  ) {
    if (conversationId) {
      const conversation = await this.conversationRepo.getById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
      }
    } else {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND);
    }

    return withTransaction(async (tx) => {
      const conversationRepo = new ConversationRepository(tx);
      const messageRepo = new MessageRepository(tx);


      let targetConversationId = conversationId;
      if (!targetConversationId) {
        const newConversation = await conversationRepo.create({
          userId,
          title: payload.title?.trim() || payload.content.slice(0, 50),
          modelName: payload.modelName,
        });
        targetConversationId = newConversation.id;
      }

      const userMessage = await messageRepo.create({
        conversationId: targetConversationId,
        content: payload.content,
        senderType: 'user',
        modelName: payload.modelName,
      });

      const history = await messageRepo.findRecentByConversationId(
        targetConversationId,
        10
      );

      return {
        conversationId: targetConversationId,
        userMessage: MessageMapper.toMessageResponseDto(userMessage),
        context: buildChatContext(history),
      };
    });
  }


  /**
   * Lưu câu trả lời hoàn chỉnh của assistant sau khi quá trình stream kết thúc.
   */
  async saveAssistantMessage(
    conversationId: string,
    content: string,
    modelName: string
  ) {
    const assistantMessage = await this.messageRepo.create({
      conversationId,
      content,
      senderType: 'assistant',
      modelName,
    });

    return MessageMapper.toMessageResponseDto(assistantMessage);
  }
}

export const messageService = new MessageService(
  conversationRepository,
  userRepository,
  messageRepository
);
