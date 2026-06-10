import { ConversationFull } from "../repositories/conversation.repository.js";
import { ConversationDetailResponseDto, ConversationSummaryResponseDto, ConversationUpdateResponseDto} from "../types/conversation.type.js";
import { Conversation } from "@prisma/client";

export class ConversationMapper {

 static toDetailDto(conversation: ConversationFull): ConversationDetailResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        modelName: msg.modelName,
        createdAt: msg.createdAt
      })),
    };
  }


  static toUpdateDto(conversation: Conversation): ConversationUpdateResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      updatedAt: conversation.updatedAt, 
    };
  }

  static toSummaryDto(conversation: Conversation): ConversationSummaryResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
    };
  }


}
