import env from '../config/env.js';
import { AI_MODEL_CONFIG, AiModelKey } from '../constants/ai-model.constant.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { ChatContextMessage } from '../utils/chat-text.util.js';
import { AiProvider } from './ai/ai-provider.js';
import GroqProvider from './ai/groq.provider.js';


export class AiService {
  private readonly providers: Map<string, AiProvider>;

  constructor(providers: AiProvider[] = [new GroqProvider()]) {
    this.providers = new Map(
      providers.map(provider => [provider.name, provider])
    );
  }

  async *stream(
    context: ChatContextMessage[],
    modelName: AiModelKey,
    signal?: AbortSignal
  ): AsyncGenerator<string> {

    const config = AI_MODEL_CONFIG[modelName];
    const provider = this.providers.get(config.provider);

    if (!provider) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        `Unsupported AI provider: ${config.provider}`
      );
    }

    const aiStream = provider.stream(
      context,
      config.modelName,
      signal
    );

    for await (const chunk of aiStream) {
      yield chunk;
    }
  }

}

export default AiService;
