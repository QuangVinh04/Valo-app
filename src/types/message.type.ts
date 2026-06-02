import { z } from 'zod';



export const sendMessageSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  content: z.string().trim().min(1, 'Message content is required'),
  modelName: z.string().trim().min(2, 'Model name is required').max(100, 'Model name is too long'),
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

   
