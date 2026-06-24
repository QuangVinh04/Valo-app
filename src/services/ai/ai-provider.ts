import { FileUploadDto } from '../../types/upload.type.js';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiStreamOptions {
  history?: AiChatMessage[];
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
}
