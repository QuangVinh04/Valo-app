import { z } from 'zod';
import { AI_MODELS_VALUES, AiModelKey } from '../constants/ai-model.constant.js';



export const sendMessageSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  content: z.string().trim().min(1, 'Message content is required'),
  modelName: z.enum(AI_MODELS_VALUES)
});


export type SendMessageRequestDto = z.infer<typeof sendMessageSchema>;

export interface MessageResponseDto {
  id: string;
  content: string;
  senderType: string;
  modelName: AiModelKey;
  createdAt: Date;
}

export interface SendMessageResponseDto {
  conversationId: string;
  userMessage: MessageResponseDto;
  assistantMessage: MessageResponseDto;
}

   
