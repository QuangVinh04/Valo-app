import { MessageResponseDto } from '../../types/message.type.js';

export interface AiStreamOptions {
  chatId?: string | null;
  sessionId?: string | null;
  conversationId?: string;
  files?: UploadedAiFile[];
  signal?: AbortSignal;
}

export interface UploadedAiFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
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
