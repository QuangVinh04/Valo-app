import { ErrorCode, type ErrorCodeDescription } from '../constants/error-code.js';

type ErrorCodeKey = keyof typeof ErrorCode;

function getErrorKey(error: ErrorCodeDescription): ErrorCodeKey | undefined {
  const entry = Object
    .entries(ErrorCode)
    .find(([, value]) => value === error);

  return entry?.[0] as ErrorCodeKey | undefined;
}


export default class AppError extends Error {
  readonly statusCode: number;
  readonly message: string;
  readonly isOperational: boolean;
  readonly errorKey?: ErrorCodeKey;

  constructor(error: ErrorCodeDescription, customMessage?: string) {
    const message = customMessage ?? error.message;

    super(message);

    this.statusCode = error.statusCode;
    this.message = message;
    this.isOperational = true;
    this.errorKey = getErrorKey(error);

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
