import { AI_MODEL_CONFIG, AiModelKey } from '../constants/ai-model.constant.js';
import { ErrorCode } from '../constants/error-code.js';
import { MessageResponseDto } from '../types/message.type.js';
import AppError from '../utils/app-error.js';
import { AiProvider, AiStreamChunk, AiStreamOptions } from './ai/ai-provider.js';
import FlowiseProvider from './ai/flowise.provider.js';


export class AiService {
  private readonly providers: Map<string, AiProvider>;

  constructor(providers: AiProvider[] = [new FlowiseProvider()]) {
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
        `Unsupported AI provider: ${config.provider}`
      );
    }

    try {
      const aiStream = provider.stream(
        question,
        config.modelName,
        options
      );

      for await (const chunk of aiStream) {
        yield chunk;
      }
    } catch (error) {
      throw error;
    }
  }

  async getHistory(
      modelName: AiModelKey,
      chatId: string,
      sessionId: string,
      signal ?: AbortSignal
    ): Promise < MessageResponseDto[] > {
      const config = AI_MODEL_CONFIG[modelName];
      const provider = this.providers.get(config.provider);

      if(!provider?.getHistory) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          `AI provider does not support chat history: ${config.provider}`
        );
      }

    return provider.getHistory(chatId, sessionId, signal);
    }

  }

export default AiService;
