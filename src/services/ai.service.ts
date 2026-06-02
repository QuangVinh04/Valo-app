import env from '../config/env.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';
import { ChatContextMessage } from '../utils/chat-text.util.js';
import { AiProvider } from './ai/ai-provider.js';
import GroqProvider from './ai/groq.provider.js';

interface ResolvedModel {
  providerName: string;
  modelName: string;
}

export class AiService {
  private readonly providers: Map<string, AiProvider>;

  constructor(providers: AiProvider[] = [new GroqProvider()]) {
    this.providers = new Map(
      providers.map(provider => [provider.name, provider])
    );
  }

  async *stream(
    context: ChatContextMessage[],
    rawModelName: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const { providerName, modelName } = this.resolveModel(rawModelName);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        `Unsupported AI provider: ${providerName}`
      );
    }

    yield* provider.stream(context, {
      modelName,
      signal,
    });
  }

  private resolveModel(rawModelName: string): ResolvedModel {
    const [providerPrefix, ...modelParts] = rawModelName.split(':');

    if (modelParts.length > 0) {
      return {
        providerName: providerPrefix.trim(),
        modelName: modelParts.join(':').trim(),
      };
    }

    return {
      providerName: env.AI_PROVIDER,
      modelName: rawModelName.trim(),
    };
  }
}

export default AiService;

