import { ConversationFull, ConversationListItem } from "../repositories/conversation.repository.js";
import { ConversationListItemDto, ConversationResponseDto } from "../types/conversation.type.js";


export class ConversationMapper {
  static toConversationResponseDto(conversation: ConversationFull): ConversationResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      userId: conversation.userId,
      messages: conversation.messages.map(message => ({
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        modelName: message.modelName,
        createdAt: message.createdAt
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }

  static toConversationListItemDto(conversation: ConversationListItem): ConversationListItemDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      userId: conversation.userId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }
}
