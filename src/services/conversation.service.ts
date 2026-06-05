import { ConversationRepository } from '../repositories/conversation.repository.js';
import UserRepository from '../repositories/user.repository.js';
import { CreateConversationRequestDto, UpdateConversationRequestDto } from '../types/conversation.type.js';
import { ConversationMapper } from '../mapper/conversation.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import { buildCursorPaginatedResult, CursorPaginationOptions } from '../utils/pagination.util.js';

export class ConversationService {
    private conversationRepo: ConversationRepository;
    private userRepo: UserRepository;

    constructor(conversationRepo: ConversationRepository, userRepo: UserRepository) {
        this.conversationRepo = conversationRepo;
        this.userRepo = userRepo;
    }


    /**
     * Tạo cuộc hội thoại mới cho người dùng sau khi xác nhận userId hợp lệ.
     */
    async createNewConversation(userId: string, payload: CreateConversationRequestDto) {

        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError(ErrorCode.USER_NOT_FOUND);
        }
        const conversation = await withTransaction(async (tx) => {
            const conversationRepo = new ConversationRepository(tx);

            return conversationRepo.create({
                title: payload.title,
                modelName: payload.modelName,
                userId: user.id,
            });
        });

        return ConversationMapper.toConversationResponseDto(conversation);
    }

    /**
     * Lấy chi tiết cuộc hội thoại theo ID; báo lỗi nếu không tồn tại.
     */
    async getConversationById(userId: string, id: string) {
        const conversation = await this.conversationRepo.getById(id);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }

        if(conversation.userId !== userId) {
            throw new AppError(ErrorCode.FORBIDDEN);
        }

        return ConversationMapper.toConversationResponseDto(conversation);
    }

    /**
     * Cập nhật tiêu đề hoặc model của cuộc hội thoại trong transaction.
     */
    async updateConversation(userId: string, id: string, updates: UpdateConversationRequestDto) {

        const conversation = await this.conversationRepo.getById(id);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        
        if(conversation.userId !== userId) {
            throw new AppError(ErrorCode.FORBIDDEN);
        }

        const updated = await withTransaction(async (tx) => {
            const conversationRepo = new ConversationRepository(tx);
            const result = await conversationRepo.update(id, updates);
            if (!result) {
                throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
            }
            return result;
        });
        return ConversationMapper.toConversationResponseDto(updated);

    }

    /**
     * Xóa một cuộc hội thoại sau khi kiểm tra nó tồn tại.
     */
    async deleteConversation(userId: string, id: string) {
        const conversation = await this.conversationRepo.getById(id);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        
        if(conversation.userId !== userId) {
            throw new AppError(ErrorCode.FORBIDDEN);
        }
    
        const deleted = await this.conversationRepo.delete(id);
        if (!deleted) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        return deleted;
    }

    /**
     * Xóa toàn bộ cuộc hội thoại của một người dùng hợp lệ.
     */
    async clearUserConversations(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError(ErrorCode.USER_NOT_FOUND);
        }

        return this.conversationRepo.deleteManyByUserId(userId);
    }

    /**
     * Lấy danh sách cuộc hội thoại của người dùng theo cursor pagination.
     */
    async getConversations(userId: string, pagination: CursorPaginationOptions) {
        const conversations = await this.conversationRepo.findManyCursor({
            userId,
            cursor: pagination.cursor,
            take: pagination.limit + 1,
        });

        return buildCursorPaginatedResult(
            conversations.map(ConversationMapper.toConversationListItemDto),
            pagination.limit
        );
    }
}
