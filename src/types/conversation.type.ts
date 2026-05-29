import { z } from 'zod';

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

export interface ConversationResponseDto {
  id: string;
  title: string;
  modelName: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    content: string;
    senderType: string;
    modelName: string;
    createdAt: Date;
  }>;
}
   
