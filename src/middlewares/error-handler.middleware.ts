import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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
    error.code
  );
};

const resolvePrismaError = (err: unknown): ErrorCodeDescription | null => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target : [];

    if (target.includes('email')) {
      return ErrorCode.EMAIL_ALREADY_IN_USE;
    }

    if (target.includes('name')) {
      return ErrorCode.GROUP_NAME_ALREADY_IN_USE;
    }

    return ErrorCode.BAD_REQUEST;
  }

  if (err.code === 'P2025') {
    return ErrorCode.BAD_REQUEST;
  }

  return null;
};

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isZodError = err instanceof ZodError;
  const isOperational = err?.isOperational === true;
  const prismaMeta = resolvePrismaError(err);
  const fallbackMeta = ErrorCode.INTERNAL_SERVER_ERROR;
  const resolvedMeta = isZodError
    ? ErrorCode.VALIDATION_FAILED
    : prismaMeta ?? (isOperational ? err : fallbackMeta);
    
  const statusCode = resolvedMeta.statusCode;
  const code = resolvedMeta.code;
  const message = isOperational && err.message ? err.message : resolvedMeta.message;

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
