import { ChatContextMessage } from '../../utils/chat-text.util.js';



export interface AiProvider {
  name: string;
  stream(
    context: ChatContextMessage[],
    modelName: string,
    signal?: AbortSignal
  ): AsyncGenerator<string>;
}

