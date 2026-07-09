import { z } from 'zod';
import { AI_MODELS_VALUES } from '../constants/ai-model.constant.js';
import { FileUploadDto } from './upload.type.js';


export const sendMessageSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  question: z.string().trim().min(1, 'Question is required'),
  modelName: z.enum(AI_MODELS_VALUES),
  fileContext: z.string().trim().max(30000).optional(),
  fileUploads: z.array(z.object({
    data: z.string().trim().url(),
    name: z.string().trim().min(1),
    type: z.literal('url'),
    mime: z.string().trim().min(1),
    size: z.number().int().nonnegative().optional(),
  })).max(5).optional(),
});

export type SendMessageRequestDto = z.infer<typeof sendMessageSchema>;


export interface MessageResponseDto {
  id: string;
  content: string;
  senderType: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  modelName: string | null;
  createdAt: Date;
  fileUploads?: FileUploadDto[];
}

export interface SendMessageResponseDto {
  conversationId: string;
  userMessage: MessageResponseDto;
  assistantMessage: MessageResponseDto;
}

   
