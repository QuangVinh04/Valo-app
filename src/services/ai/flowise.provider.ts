import env from '../../config/env.js';
import { ErrorCode } from '../../constants/error-code.js';
import { MessageResponseDto } from '../../types/message.type.js';
import AppError from '../../utils/app-error.js';
import { AiProvider, AiStreamChunk, AiStreamOptions } from './ai-provider.js';


type FlowisePredictionResponse = {
  event: string;
  data?: string | {
    chatId?: string;
    sessionId?: string;
    chatMessageId?: string;
    executionId?: string;
  };
  chatId?: string;
  sessionId?: string;
  chatMessageId?: string;
  executionId?: string;
};

type FlowiseChatMessage = {
  id: string;
  role: 'userMessage' | 'apiMessage' | string; // Giao diện API thực tế dùng 2 giá trị này
  content: string;
  chatId: string;
  sessionId: string;
  createdDate: string; // Bản chuẩn JSON của bạn trả về trường này dạng ISO String
};

type FlowiseUpload = {
  data: string;
  type: 'file';
  name: string;
  mime: string;
};

export class FlowiseProvider implements AiProvider {
  readonly name = 'flowise';

  constructor(
    private readonly apiKey = env.FLOWISE_API_KEY,
    private readonly baseUrl = env.FLOWISE_BASE_URL,
    private readonly chatflowId = env.FLOWISE_CHATFLOW_ID
  ) {
    if (!apiKey) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'FLOWISE_API_KEY is not configured');
    }

    if (!chatflowId) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'FLOWISE_CHATFLOW_ID is not configured');
    }
  }

  async *stream(
    question: string,
    _modelName: string,
    options: AiStreamOptions
  ): AsyncGenerator<AiStreamChunk> {

    try {
      const body = {
        question,
        streaming: true,
        ...(options.chatId && { chatId: options.chatId }),
        ...(options.sessionId && { sessionId: options.sessionId }),
        ...(options.files?.length && {
          uploads: options.files.map((file): FlowiseUpload => ({
            data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            type: 'file',
            name: file.originalname,
            mime: file.mimetype,
          })),
        }),
      };

      const response = await fetch(this.predictionUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new AppError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Flowise prediction API error (${response.status}): ${detail || response.statusText}`
        );
      }

      if (!response.body) throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Response unreadable');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let chatId = options.chatId ?? undefined;
      let sessionId = options.sessionId ?? undefined;


      let buffer = '';
      let streamEnded = false;

      while (!streamEnded) {
        if (options.signal?.aborted) {
          reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          if (!buffer.trim()) break;
          buffer += '\n\n';
        } else {
          // 1. Nhận dữ liệu text từ luồng mạng
          buffer += decoder.decode(value, { stream: true });
        }

        // 2. Dữ liệu Flowise/Bkav trả về theo từng block: message: + data:{...}
        let boundaryIndex: number;
        while (true) {
          const lfBoundary = buffer.indexOf('\n\n');
          const crlfBoundary = buffer.indexOf('\r\n\r\n');

          if (lfBoundary === -1 && crlfBoundary === -1) break;

          boundaryIndex = lfBoundary === -1
            ? crlfBoundary
            : crlfBoundary === -1
              ? lfBoundary
              : Math.min(lfBoundary, crlfBoundary);

          const eventBlock = buffer.slice(0, boundaryIndex).trim();
          buffer = buffer.slice(
            buffer.startsWith('\r\n\r\n', boundaryIndex)
              ? boundaryIndex + 4
              : boundaryIndex + 2
          ); // Cắt bỏ khối đã xử lý khỏi bộ đệm

          const dataLine = eventBlock
            .split(/\r?\n/)
            .find((line) => line.startsWith('data:'));

          if (!dataLine) continue;

          const dataContent = dataLine.slice(5).trim();
          let parsed: FlowisePredictionResponse;

          try {
            parsed = JSON.parse(dataContent) as FlowisePredictionResponse;
          } catch {
            continue;
          }

          // ĐỌC ĐƯỢC 1 TOKEN -> YIELD THẲNG SANG CONTROLLER NGAY LẬP TỨC
          if (parsed.event === 'token' && typeof parsed.data === 'string') {
            yield { content: parsed.data };
            continue;
          }

          // Hứng chính xác thông tin ID từ block sự kiện 'metadata' của Bkav
          if (parsed.event === 'metadata') {
            if (parsed.data && typeof parsed.data === 'object') {
              if (parsed.data.chatId) chatId = parsed.data.chatId;
              if (parsed.data.sessionId) sessionId = parsed.data.sessionId;
            }
            continue;
          }

          // Bắt sự kiện kết thúc hệ thống nếu cần chủ động kết thúc sớm
          if (parsed.event === 'end') {
            streamEnded = true;
            break;
          }
        }

        if (done) break;
      }

      yield {
        content: '',
        chatId,
        sessionId,
      };

    } catch (error) {
      if (options.signal?.aborted) return;
      throw this.toAppError(error);
    }
  }

  async getHistory(
    chatId: string,
    sessionId: string,
    signal?: AbortSignal
  ): Promise<MessageResponseDto[]> {

    try {
      const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/api/v1/chatmessage/${this.chatflowId}`);
      url.searchParams.set('order', 'ASC');
      url.searchParams.set('feedback', 'true');
      url.searchParams.set('chatId', chatId);
      url.searchParams.set('sessionId', sessionId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new AppError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Flowise history API error (${response.status}): ${detail || response.statusText}`
        );
      }

      const messages = await response.json() as FlowiseChatMessage[];

      return messages.map((message) => {
        let senderType: MessageResponseDto['senderType'] = 'user';
        if (message.role === 'apiMessage') {
          senderType = 'assistant';
        }
        return {
          id: message.id,
          content: message.content,
          senderType,
          modelName: 'flowise-agent',
          createdAt: new Date(message.createdDate),
        }
      });
    } catch (error) {
      if (signal?.aborted) return [];
      throw this.toAppError(error);
    }
  }

  private predictionUrl(): string {
    return `${this.normalizedBaseUrl()}/api/v1/prediction/${this.chatflowId}`;
  }

  private normalizedBaseUrl(): string {
    return this.baseUrl
      .trim()
      .replace(/,+$/, '')
      .replace(/\/+$/, '')
      .replace(/\/api\/v1$/, '');
  }

  private toAppError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const message = error instanceof Error
      ? error.message
      : 'Flowise API request failed';

    return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message);
  }
}

export default FlowiseProvider;
