import Groq from 'groq-sdk';
import env from '../../config/env.js';
import { ErrorCode } from '../../constants/error-code.js';
import AppError from '../../utils/app-error.js';
import { ChatContextMessage } from '../../utils/chat-text.util.js';
import { AiProvider } from './ai-provider.js';

export class GroqProvider implements AiProvider {
  readonly name = 'groq';

  private readonly groqClient: Groq;

  constructor(apiKey: string){
    if(!apiKey) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'GROQ_API_KEY is not configured');
    }
    this.groqClient = new Groq({
      apiKey,
      baseURL: this.normalizeBaseUrl(env.GROQ_BASE_URL),
    });
  }

  async *stream(
    context: ChatContextMessage[],
    modelName: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    if (!env.GROQ_API_KEY) {
      throw new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'GROQ_API_KEY is not configured'
      );
    }

    

    try {
      const stream = await this.groqClient.chat.completions.create(
        {
          model: modelName,
          messages: context,
          stream: true,
        },
        {
          signal: signal,
        }
      );

      for await (const chunk of stream) {
        if (signal?.aborted) return;

        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    } catch (error) {
      if (signal?.aborted) return;
      throw this.toAppError(error);
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/openai\/v1\/?$/, '');
  }

  private toAppError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const status = typeof error === 'object' && error && 'status' in error
      ? Number(error.status)
      : undefined;
    const message = error instanceof Error
      ? error.message
      : 'Groq API request failed';

    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      status ? `Groq API error (${status}): ${message}` : message
    );
  }
}

export default GroqProvider;
