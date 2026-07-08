import { MessageResponseDto } from '../types/message.type.js';




//TODO: Bkav HoanNTh: Rà soát lại toàn bộ mapper, chỉ trả những thông tin cần
// Bkav VinhTQ: Done
export class MessageMapper {
    static toMessageResponse(message: {
      id: string;
      content: string;
      senderType: string;
      status?: 'PENDING' | 'SUCCESS' | 'FAILED';
      modelName: string | null;
      createdAt: Date;
      attachments?: Array<{
        fileName: string;
        mimeType: string;
        fileUrl: string | null;
        fileSize: number | null;
      }>;
    }): MessageResponseDto {
      const fileUploads = message.attachments
        ?.filter((attachment) => attachment.fileUrl)
        .map((attachment) => ({
          data: attachment.fileUrl as string,
          name: attachment.fileName,
          type: 'url' as const,
          mime: attachment.mimeType,
          ...(typeof attachment.fileSize === 'number' ? { size: attachment.fileSize } : {}),
        }));
  
      return {
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        ...(message.status ? { status: message.status } : {}),
        modelName: message.modelName,
        createdAt: message.createdAt,
        ...(fileUploads?.length ? { fileUploads } : {}),
      };
    }
}
