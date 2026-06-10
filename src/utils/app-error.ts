import type { ErrorCodeDescription } from '../constants/error-code.js';


export default class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(error: ErrorCodeDescription, customMessage?: string) {
    super(customMessage ?? error.message);

    this.statusCode = error.statusCode;
    this.code = error.code;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
