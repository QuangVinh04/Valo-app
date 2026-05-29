import { ConversationRepository } from '../repositories/conversation.repository.js';
import UserRepository from '../repositories/user.repository.js';
import { CreateConversationRequestDto, UpdateConversationRequestDto } from '../types/conversation.type.js';
import { ConversationMapper } from '../mapper/conversation.mapper.js';
import AppError from '../utils/app-error.js';
import { ErrorCode } from '../constants/error-code.js';
import { withTransaction } from '../database/transaction.js';
import { buildPaginatedResult, PaginationOptions } from '../utils/pagination.util.js';

export class ConversationService {
    private conversationRepo: ConversationRepository;
    private userRepo: UserRepository;

    constructor(conversationRepo: ConversationRepository, userRepo: UserRepository) {
        this.conversationRepo = conversationRepo;
        this.userRepo = userRepo;
    }


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

    async getConversationById(id: string) {
        const conversation = await this.conversationRepo.getById(id);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        return ConversationMapper.toConversationResponseDto(conversation);
    }

    async updateConversation(id: string, updates: UpdateConversationRequestDto) {
        
        const conversation = await withTransaction(async (tx) => {
            const conversationRepo = new ConversationRepository(tx);
            const result = await conversationRepo.update(id, updates);
            if (!result) {
                throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
            }
            return result;
        });
        return ConversationMapper.toConversationResponseDto(conversation);

    }

    async deleteConversation(id: string) {
        const conversation = await this.conversationRepo.getById(id);
        if (!conversation) {
            throw new AppError(ErrorCode.CONVERSATION_NOT_FOUND);
        }
        return this.conversationRepo.delete(id);
    }

    async getConversations(userId: string, pagination : PaginationOptions){
        const [conversations, total] = await Promise.all([
            this.conversationRepo.findMany({
                userId,
                skip: pagination.skip,
                take: pagination.limit,
            }),
            this.conversationRepo.count(userId),
        ]);
        return buildPaginatedResult(
            conversations.map(ConversationMapper.toConversationResponseDto),
            total,
            pagination
        );
    }
}
