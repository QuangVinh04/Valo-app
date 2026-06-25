import Groq from 'groq-sdk';
import env from '../../config/env.js';
import { ErrorCode } from '../../constants/error-code.js';
import AppError from '../../utils/app-error.js';
import { AiProvider, AiStreamChunk, AiStreamOptions } from './ai-provider.js';

export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  private readonly groqClient: Groq;

  constructor(
    private readonly apiKey = env.GROQ_API_KEY,
    private readonly baseUrl = env.GROQ_BASE_URL
  ) {
    if (!apiKey) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'GROQ_API_KEY is not configured');
    }

    this.groqClient = new Groq({
      apiKey,
      baseURL: baseUrl,
    });
  }

  async *stream(
    question: string,
    modelName: string,
    options: AiStreamOptions
  ): AsyncGenerator<AiStreamChunk> {
    try {
      const stream = await this.groqClient.chat.completions.create(
        {
          model: modelName,
          messages: [
            ...(options.history ?? []),
            { role: 'user', content: question },
          ],
          stream: true,
        },
        {
          signal: options.signal,
        }
      );

      for await (const chunk of stream) {
        if (options.signal?.aborted) return;

        const content = chunk.choices[0]?.delta?.content;
        if (content) yield { content };
      }

      yield { content: '' };
    } catch (error) {
      if (options.signal?.aborted) return;
      throw this.toAppError(error);
    }
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
