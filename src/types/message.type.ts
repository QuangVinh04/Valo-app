import { z } from 'zod';
import { AI_MODELS_VALUES } from '../constants/ai-model.constant.js';



export const sendMessageSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  question: z.string().trim().min(1, 'Question is required'),
  modelName: z.enum(AI_MODELS_VALUES)
});


export type SendMessageRequestDto = z.infer<typeof sendMessageSchema>;

export interface MessageResponseDto {
  id: string;
  content: string;
  senderType: string;
  modelName: string | null;
  createdAt: Date;
}

export interface SendMessageResponseDto {
  conversationId: string;
  userMessage: MessageResponseDto;
  assistantMessage: MessageResponseDto;
}

   
