import { conversationRepository, ConversationRepository } from '../repositories/conversation.repository.js';
import { CreateConversationRequestDto, UpdateConversationRequestDto, ConversationDetailResponseDto, ConversationUpdateResponseDto, ConversationSummaryResponseDto}from '../types/conversation.type.js';
import { ConversationMapper } from '../mapper/conversation.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { buildCursorPaginatedResult, CursorPaginatedResult, CursorPaginationOptions } from '../utils/pagination.util.js';
import AiService from './ai.service.js';
import { AiModel, AiModelKey } from '../constants/ai-model.constant.js';

export class ConversationService {
    private conversationRepo: ConversationRepository;
    private aiService: AiService;


    constructor(conversationRepo: ConversationRepository, aiService: AiService) {
        this.conversationRepo = conversationRepo;
        this.aiService = aiService;

    }


    /**
     * Tạo cuộc hội thoại mới cho người dùng sau khi xác nhận userId hợp lệ.
     */
    async createNewConversation(userId: string, 
        payload: CreateConversationRequestDto): Promise<ConversationDetailResponseDto> {
        const conversation = await this.conversationRepo.create({
                title: payload.title,
                modelName: payload.modelName,
                userId: userId,
            });

        return ConversationMapper.toDetailDto(conversation);
    }

    /**
     * Lấy chi tiết cuộc hội thoại theo ID; báo lỗi nếu không tồn tại.
     */
    async getConversationById(userId: string, id: string): Promise<ConversationDetailResponseDto> {

        const conversation = await this.conversationRepo.getByIdAndUserId(id, userId);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }

        const detail = ConversationMapper.toDetailDto(conversation);

        if (conversation.chatId && conversation.sessionId) {
            detail.messages = await this.aiService.getHistory(
                (conversation.modelName ?? AiModel.FLOWISE_AGENT) as AiModelKey,
                conversation.chatId,
                conversation.sessionId
            );
        }

        return detail;
    }

    /**
     * Cập nhật tiêu đề hoặc model của cuộc hội thoại trong transaction.
     */
    async updateConversation(
        userId: string, 
        id: string, 
        updates: UpdateConversationRequestDto): Promise<ConversationUpdateResponseDto> {

        const conversation = await this.conversationRepo.getByIdAndUserId(id, userId);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        
        const updated = await this.conversationRepo.update(id, updates);
            
        return ConversationMapper.toUpdateDto(updated);

    }

    /**
     * Xóa một cuộc hội thoại sau khi kiểm tra nó tồn tại.
     */
    async deleteConversation(userId: string, id: string): Promise<boolean> {
        const conversation = await this.conversationRepo.getByIdAndUserId(id, userId);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
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
    async clearUserConversations(userId: string): Promise<number> {
        
        const result = await this.conversationRepo.deleteManyByUserId(userId);

        return result;
    }

    /**
     * Lấy danh sách cuộc hội thoại của người dùng theo cursor pagination.
     */
    async getConversations(userId: string, pagination: CursorPaginationOptions): Promise<CursorPaginatedResult<ConversationSummaryResponseDto>> {
        const conversations = await this.conversationRepo.findManyCursor({
            userId,
            cursor: pagination.cursor,
            take: pagination.limit + 1,
        });

        return buildCursorPaginatedResult(
            conversations.map(ConversationMapper.toSummaryDto),
            pagination.limit
        );
    }
}

export const conversationService = new ConversationService(conversationRepository, new AiService());
