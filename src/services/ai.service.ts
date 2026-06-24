import { AI_MODEL_CONFIG, AiModelKey } from '../constants/ai-model.constant.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import env from '../config/env.js';
import { AiProvider, AiStreamChunk, AiStreamOptions } from './ai/ai-provider.js';
import FlowiseProvider from './ai/flowise.provider.js';
import GroqProvider from './ai/groq.provider.js';


export class AiService {
  private readonly providers: Map<string, AiProvider>;

  constructor(providers: AiProvider[] = createDefaultProviders()) {
    this.providers = new Map(
      providers.map(provider => [provider.name, provider])
    );
  }

  /**
   * Stream phản hồi từ provider tương ứng với modelName đã cấu hình.
   */
  async *stream(
    question: string,
    modelName: AiModelKey,
    options: AiStreamOptions
  ): AsyncGenerator<AiStreamChunk> {

    const config = AI_MODEL_CONFIG[modelName];
    const provider = this.providers.get(config.provider);

    if (!provider) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        `AI provider is not configured: ${config.provider}`
      );
    }

    const aiStream = provider.stream(
      question,
      config.modelName,
      options
    );

    for await (const chunk of aiStream) {
      yield chunk;
    }
  }
}

export default AiService;

function createDefaultProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  if (env.FLOWISE_API_KEY && env.FLOWISE_BASE_URL && env.FLOWISE_CHATFLOW_ID) {
    providers.push(new FlowiseProvider());
  }

  if (env.GROQ_API_KEY) {
    providers.push(new GroqProvider());
  }

  return providers;
}
