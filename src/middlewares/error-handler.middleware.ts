import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '../constants/error-code.js';
import { sendError } from '../utils/api-response.js';
import { resolveLanguage, translateMessage } from '../utils/i18n.util.js';
import logger from '../utils/logger.util.js';


export const notFoundHandler = (req: Request, res: Response) => {
  const error = ErrorCode.ROUTE_NOT_FOUND;
  const language = resolveLanguage(req.headers['accept-language']);
  const message = translateMessage(language, error.message, 'ROUTE_NOT_FOUND');
  
  return sendError(
    res, 
    `${message}: ${req.originalUrl}`,
    error.statusCode,
  );
};


export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const language = resolveLanguage(req.headers['accept-language']);
  const isZodError = err instanceof ZodError;
  const isOperationalError = err?.isOperational === true;
  const fallbackMeta = ErrorCode.INTERNAL_SERVER_ERROR;
  const resolvedMeta = isZodError
    ? ErrorCode.VALIDATION_FAILED
    : isOperationalError
      ? (err.errorKey && ErrorCode[err.errorKey]) || fallbackMeta
      : fallbackMeta;

  const statusCode =
    isZodError || isOperationalError
      ? err.statusCode || resolvedMeta.statusCode
      : fallbackMeta.statusCode;
  const rawMessage = isZodError
    ? resolvedMeta.message
    : isOperationalError
      ? err.message || resolvedMeta.message
      : fallbackMeta.message;
  const messageKey = isZodError
    ? 'VALIDATION_FAILED'
    : rawMessage === resolvedMeta.message
      ? err?.errorKey
      : undefined;
  const message = translateMessage(
    language,
    rawMessage,
    messageKey
  );

  let errors: any[] | null = null;

  if (isZodError) {
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: translateMessage(language, issue.message)
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

  //TODO: Bkav HoanNTh: chỉ trả http status code và message, không trả quá chi tiết
  //FIXME: Bkav VinhTQ: Done
  return sendError(res, message, statusCode);
};
