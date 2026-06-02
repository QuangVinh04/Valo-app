import { ChatContextMessage } from '../utils/chat-text.util.js';

export class AiService {
  async *stream(
    context: ChatContextMessage[],
    _modelName: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const latestUserMessage = context
      .slice()
      .reverse()
      .find(message => message.role === 'user');
    const content = `Echo: ${latestUserMessage?.content ?? ''}`;

    for (const chunk of content.split(/(\s+)/).filter(Boolean)) {
      if (signal?.aborted) return;

      await new Promise(resolve => setTimeout(resolve, 100));
      yield chunk;
    }
  }
}

export default AiService;
