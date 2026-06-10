import { z } from 'zod';
import { MessageResponseDto } from './message.type.js';

export const createConversationSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(100, 'Title is too long'),
  modelName: z.string().trim().min(2, 'Model name is required').max(100, 'Model name is too long'),
});


export const updateConversationSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(100, 'Title is too long').optional(),
  modelName: z.string().trim().min(2, 'Model name is required').max(100, 'Model name is too long').optional(),
});



export type CreateConversationRequestDto = z.infer<typeof createConversationSchema>;
export type UpdateConversationRequestDto = z.infer<typeof updateConversationSchema>;

// DTO cho API lấy danh sách ở Sidebar 
export interface ConversationSummaryResponseDto {
  id: string;
  title: string;
}

// DTO cho API cập nhật (Update) hoặc tạo mới (Create)
export interface ConversationUpdateResponseDto {
  id: string;
  title: string;
  modelName: string;
  updatedAt: Date; 
}


export interface ConversationDetailResponseDto {
  id: string;
  title: string;
  modelName: string;
  messages: MessageResponseDto[];
}

   
