import { ConversationDetail, ConversationSummary, ConversationUpdate } from "../repositories/conversation.repository.js";
import { ConversationDetailResponseDto, ConversationSummaryResponseDto, ConversationUpdateResponseDto} from "../types/conversation.type.js";

export class ConversationMapper {

 static toDetailDto(conversation: ConversationDetail): ConversationDetailResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      chatId: conversation.chatId,
      sessionId: conversation.sessionId,
      messages: [],
    };
  }


  static toUpdateDto(conversation: ConversationUpdate): ConversationUpdateResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      modelName: conversation.modelName,
      updatedAt: conversation.updatedAt, 
    };
  }

  static toSummaryDto(conversation: ConversationSummary): ConversationSummaryResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
    };
  }


}
