import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, type ErrorCodeDescription } from '../constants/error-code.js';
import { sendError } from '../utils/api-response.js';
import logger from '../utils/logger.util.js';


export const notFoundHandler = (req: Request, res: Response) => {
  const error = ErrorCode.ROUTE_NOT_FOUND;
  
  return sendError(
    res, 
    `Route not found: ${req.originalUrl}`,
    error.statusCode,
  );
};


export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isZodError = err instanceof ZodError;
  const fallbackMeta = ErrorCode.INTERNAL_SERVER_ERROR;
  const resolvedMeta = isZodError
    ? ErrorCode.VALIDATION_FAILED
    : (err.errorKey && ErrorCode[err.errorKey]) || fallbackMeta;
    
  const statusCode = isZodError ? resolvedMeta.statusCode : err.statusCode || resolvedMeta.statusCode;
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
  );
};
