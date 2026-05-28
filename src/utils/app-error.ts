import type { ErrorCodeDescription, ErrorCodeKey } from '../constants/error-code.js';
import { ErrorCode } from '../constants/error-code.js';

export default class AppError extends Error {
  statusCode: number;
  code: number;
  errorKey?: ErrorCodeKey;
  status: 'fail' | 'error';
  isOperational: boolean;

  constructor(errorConfig: ErrorCodeDescription, customMessage?: string, errorKey?: ErrorCodeKey) {
    super(customMessage ?? errorConfig.message);
    this.statusCode = errorConfig.statusCode;
    this.code = errorConfig.code;
    this.errorKey = errorKey ?? AppError.resolveErrorKey(errorConfig);
    this.status = `${errorConfig.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static fromCode(code: ErrorCodeKey, customMessage?: string): AppError {
    const meta = ErrorCode[code];
    return new AppError(meta, customMessage, code);
  }

  private static resolveErrorKey(errorConfig: ErrorCodeDescription): ErrorCodeKey | undefined {
    const pair = Object.entries(ErrorCode).find(([, value]) => value === errorConfig);
    return pair?.[0] as ErrorCodeKey | undefined;
  }
}
