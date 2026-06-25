import { conversationRepository, ConversationRepository } from '../repositories/conversation.repository.js';
import { CreateConversationRequestDto, UpdateConversationRequestDto, ConversationDetailResponseDto, ConversationUpdateResponseDto, ConversationSummaryResponseDto}from '../types/conversation.type.js';
import { ConversationMapper } from '../mapper/conversation.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { buildCursorPaginatedResult, CursorPaginatedResult, CursorPaginationOptions } from '../utils/pagination.util.js';
import { MessageService, messageService } from './message.service.js';

export class ConversationService {
    private conversationRepo: ConversationRepository;
    private messageService: MessageService;


    constructor(
        conversationRepo: ConversationRepository,
        messageService: MessageService
    ) {
        this.conversationRepo = conversationRepo;
        this.messageService = messageService;

    }


    /**
     * Tạo cuộc hội thoại mới cho người dùng sau khi xác nhận userId hợp lệ.
     */
    async createNewConversation(userId: string, 
        payload: CreateConversationRequestDto): Promise<ConversationDetailResponseDto> {
        //TODO: Bkav HoanNTh: để call được api này cần xác thực => lấy userId từ thông tin xác nghĩa là user đã tồn tại => không cần check user 
        // Bkav VinhTQ: Done
         const conversation = await this.conversationRepo.create({
                title: payload.title,
                modelName: payload.modelName,
                userId: userId,
            });

        /*TODO: Bkav HoanNTh: Cân nhắc chỉ trả về các thông tin cần, tránh DB phải xử lý thừa,
           các thông tin về message có thể cần khi get nhưng không cần khi mới tạo*/
        // Bkav VinhTQ: Done
        return ConversationMapper.toDetailDto(conversation);
    }

    /**
     * Lấy chi tiết cuộc hội thoại theo ID; báo lỗi nếu không tồn tại.
     */
    async getConversationById(userId: string, id: string): Promise<ConversationDetailResponseDto> {

        //TODO: Bkav HoanNTh: chỉ cần getByIdAndUserId và check conversation có tồn tại không để trả message lỗi
        // Bkav VinhTQ: Done
        const conversation = await this.conversationRepo.getByIdAndUserId(id, userId);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }

        const detail = ConversationMapper.toDetailDto(conversation);
        detail.messages = await this.messageService.getConversationMessages(conversation.id);

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

        //TODO: Bkav HoanNTh: dùng singleton
        // Bkav VinhTQ: Done
        const updated = await this.conversationRepo.update(id, updates);
            
        return ConversationMapper.toUpdateDto(updated);

    }

    /**
     * Xóa một cuộc hội thoại sau khi kiểm tra nó tồn tại.
     */
    async deleteConversation(userId: string, id: string): Promise<boolean> {
       //TODO: Bkav HoanNTh: để call được api này cần xác thực => lấy userId từ thông tin xác nghĩa là user đã tồn tại
      // => không cần check user
      // Bkav VinhTQ: Done
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
        //TODO: Bkav HoanNTh: để call được api này cần xác thực => lấy userId từ thông tin xác nghĩa là user đã tồn tại
      // => không cần check user
      // Bkav VinhTQ: Done
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

        /*TODO: Bkav HoanNTh: Cân nhắc chỉ trả về các thông tin cần, tránh DB phải xử lý thừa*/
        // Bkav VinhTQ: Done
        return buildCursorPaginatedResult(
            conversations.map(ConversationMapper.toSummaryDto),
            pagination.limit
        );
    }
}

export const conversationService = new ConversationService(
    conversationRepository,
    messageService
);
