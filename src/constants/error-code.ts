import { StatusCodes } from 'http-status-codes';

export interface ErrorCodeDescription {
  readonly message: string;
  readonly statusCode: number;
}

//TODO: Bkav HoanNTH: các code 9009, 9001,... để làm gì? Cân nhắc bỏ các hằng số này
// Bkav VinhTQ: Done
export const ErrorCode = {
  INTERNAL_SERVER_ERROR: {
    message: 'Internal server error',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR
  },
  VALIDATION_FAILED: {
    message: 'Validation failed',
    statusCode: StatusCodes.BAD_REQUEST
  },
  BAD_REQUEST: {
    message: 'Bad request',
    statusCode: StatusCodes.BAD_REQUEST
  },
  UNAUTHORIZED: {
    message: 'Unauthorized',
    statusCode: StatusCodes.UNAUTHORIZED
  },
  ACCESS_FORBIDDEN: {
    message: 'Access forbidden',
    statusCode: StatusCodes.FORBIDDEN
  },
  ROUTE_NOT_FOUND: {
    message: 'Route not found',
    statusCode: StatusCodes.NOT_FOUND
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Too many requests',
    statusCode: StatusCodes.TOO_MANY_REQUESTS
  },
  FORBIDDEN: {
    message: 'Forbidden',
    statusCode: StatusCodes.FORBIDDEN
  },
  USER_NOT_FOUND: {
    message: 'User not found',
    statusCode: StatusCodes.NOT_FOUND
  },
  EMAIL_ALREADY_IN_USE: {
    message: 'Email already in use',
    statusCode: StatusCodes.CONFLICT
  },
  INVALID_CREDENTIALS: {
    message: 'Invalid email or password',
    statusCode: StatusCodes.UNAUTHORIZED
  },
  MISSING_REQUIRED_FIELDS: {
    message: 'Missing required fields',
    statusCode: StatusCodes.BAD_REQUEST
  },
  PASSWORD_TOO_SHORT: {
    message: 'Password too short',
    statusCode: StatusCodes.BAD_REQUEST
  },
  INVALID_EXPIRED_OTP: {
    message: 'Invalid or expired OTP',
    statusCode: StatusCodes.BAD_REQUEST
  },
  ORIGIN_HEADER_IS_MISSING: {
    message: 'Origin header is missing',
    statusCode: StatusCodes.BAD_REQUEST
  },
  INVALID_TOKEN: {
    message: 'Invalid token',
    statusCode: StatusCodes.UNAUTHORIZED
  },

  // Group

  GROUP_NOT_FOUND: {
    message: 'Group not found',
    statusCode: StatusCodes.NOT_FOUND
  },
  
  GROUP_NAME_ALREADY_IN_USE: {
    message: 'Group name already in use',
    statusCode: StatusCodes.CONFLICT
  },

  // Conversation & message

  CONVERSATION_NOT_FOUND: {
    message: 'Conversation not found',
    statusCode: StatusCodes.NOT_FOUND
  }

} as const;
