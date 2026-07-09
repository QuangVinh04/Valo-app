import { AI_MODEL_CONFIG, AiModelKey } from '../constants/ai-model.constant.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import env from '../config/env.js';
import { AiProvider, AiStreamChunk, AiStreamOptions } from './ai/ai-provider.js';
import FlowiseProvider from './ai/flowise.provider.js';
import GroqProvider from './ai/groq.provider.js';


const defaultAiStreamTimeoutMs = 120000;


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

    const timeoutMs = getAiStreamTimeoutMs();
    const streamAbortController = new AbortController();
    let timedOut = false;
    let clientAborted = Boolean(options.signal?.aborted);

    if (clientAborted) {
      return;
    }

    const handleClientAbort = () => {
      clientAborted = true;
      streamAbortController.abort();
    };

    options.signal?.addEventListener('abort', handleClientAbort, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      streamAbortController.abort();
    }, timeoutMs);

    try {
      const aiStream = provider.stream(
        question,
        config.modelName,
        {
          ...options,
          signal: streamAbortController.signal,
        }
      );

      for await (const chunk of aiStream) {
        yield chunk;
      }

      if (timedOut) {
        throw new AppError(ErrorCode.AI_TIMEOUT);
      }
    } catch (error) {
      if (timedOut) {
        throw new AppError(ErrorCode.AI_TIMEOUT);
      }

      if (clientAborted) {
        return;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', handleClientAbort);
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

function getAiStreamTimeoutMs(): number {
  return Number.isFinite(env.AI_STREAM_TIMEOUT_MS) && env.AI_STREAM_TIMEOUT_MS > 0
    ? env.AI_STREAM_TIMEOUT_MS
    : defaultAiStreamTimeoutMs;
}
