import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import env from '../config/env.js';
import { ErrorCode } from '../constants/error-code.js';
import { sendError } from '../utils/api-response.js';
import logger from '../utils/logger.util.js';


const isDevelopment = env.NODE_ENV !== 'production';

export const notFoundHandler = (req: Request, res: Response) => {
  const error = ErrorCode.ROUTE_NOT_FOUND;
  
  return sendError(
    res, 
    `Route not found: ${req.originalUrl}`,
    error.statusCode,
    error.code
  );
};

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isZodError = err instanceof ZodError;
  const fallbackMeta = ErrorCode.INTERNAL_SERVER_ERROR;
  const resolvedMeta = isZodError
    ? ErrorCode.VALIDATION_FAILED
    : (err.errorKey && ErrorCode[err.errorKey]) || fallbackMeta;
    
  const statusCode = isZodError ? resolvedMeta.statusCode : err.statusCode || resolvedMeta.statusCode;
  const code = err.code || resolvedMeta.code;
  const message = isZodError ? resolvedMeta.message : err.message || resolvedMeta.message;

  let errors: any[] | null = null;

  if (isZodError) {
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
  }

  logger.error('Request error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errors
  });

  const finalMessage = message;

  return sendError(
    res,
    finalMessage,
    statusCode,
    code,
    errors
  );
};
