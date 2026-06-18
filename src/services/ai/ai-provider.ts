import { MessageResponseDto } from '../../types/message.type.js';
import { FileUploadDto } from '../../types/upload.type.js';

export interface AiStreamOptions {
  chatId?: string | null;
  sessionId?: string | null;
  conversationId?: string;
  fileUploads?: FileUploadDto[];
  signal?: AbortSignal;
}

export interface AiStreamChunk {
  content: string;
  chatId?: string;
  sessionId?: string;
  chatMessageId?: string;
  executionId?: string;
}

export interface AiProvider {
  name: string;
  stream(
    question: string,
    modelName: string,
    options: AiStreamOptions
  ): AsyncGenerator<AiStreamChunk>;
  getHistory?(
    chatId: string,
    sessionId: string,
    signal?: AbortSignal
  ): Promise<MessageResponseDto[]>;
}
