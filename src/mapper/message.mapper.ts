import type { Message } from '@prisma/client';
import type { MessageResponseDto } from '../types/message.type.js';

export class MessageMapper {
  static toMessageResponseDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      senderType: message.senderType,
      modelName: message.modelName,
      createdAt: message.createdAt
    };
  }
}
