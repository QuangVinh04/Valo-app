import { ChatContextMessage } from '../../utils/chat-text.util.js';

export interface AiStreamOptions {
  modelName: string;
  signal?: AbortSignal;
}

export interface AiProvider {
  name: string;
  stream(
    context: ChatContextMessage[],
    options: AiStreamOptions
  ): AsyncGenerator<string>;
}

