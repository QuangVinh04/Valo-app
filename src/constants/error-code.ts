import { StatusCodes } from 'http-status-codes';

export const SUCCESS = {
  USER_FOUND: 'User found',
  REGISTRATION_SUCCESSFUL: 'Registration successful',
  LOGIN_SUCCESSFUL: 'Login successful'
} as const;

export interface ErrorCodeDescription {
  readonly code: number;
  readonly message: string;
  readonly statusCode: number;
}

export const ErrorCode = {
  INTERNAL_SERVER_ERROR: {
    code: 9009,
    message: 'Internal server error',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR
  },
  VALIDATION_FAILED: {
    code: 9001,
    message: 'Validation failed',
    statusCode: StatusCodes.BAD_REQUEST
  },
  BAD_REQUEST: {
    code: 9002,
    message: 'Bad request',
    statusCode: StatusCodes.BAD_REQUEST
  },
  UNAUTHORIZED: {
    code: 9003,
    message: 'Unauthorized',
    statusCode: StatusCodes.UNAUTHORIZED
  },
  ACCESS_FORBIDDEN: {
    code: 9004,
    message: 'Access forbidden',
    statusCode: StatusCodes.FORBIDDEN
  },
  ROUTE_NOT_FOUND: {
    code: 9005,
    message: 'Route not found',
    statusCode: StatusCodes.NOT_FOUND
  },
  RATE_LIMIT_EXCEEDED: {
    code: 9007,
    message: 'Too many requests',
    statusCode: StatusCodes.TOO_MANY_REQUESTS
  },
  FORBIDDEN: {
    code: 9006,
    message: 'Forbidden',
    statusCode: StatusCodes.FORBIDDEN
  },
  USER_NOT_FOUND: {
    code: 4001,
    message: 'User not found',
    statusCode: StatusCodes.UNAUTHORIZED
  },
  EMAIL_ALREADY_IN_USE: {
    code: 4002,
    message: 'Email already in use',
    statusCode: StatusCodes.CONFLICT
  },
  INVALID_CREDENTIALS: {
    code: 4003,
    message: 'Invalid email or password',
    statusCode: StatusCodes.UNAUTHORIZED
  },
  MISSING_REQUIRED_FIELDS: {
    code: 4004,
    message: 'Missing required fields',
    statusCode: StatusCodes.BAD_REQUEST
  },
  PASSWORD_TOO_SHORT: {
    code: 4005,
    message: 'Password too short',
    statusCode: StatusCodes.BAD_REQUEST
  },
  INVALID_EXPIRED_OTP: {
    code: 4006,
    message: 'Invalid or expired OTP',
    statusCode: StatusCodes.BAD_REQUEST
  },
  ORIGIN_HEADER_IS_MISSING: {
    code: 4007,
    message: 'Origin header is missing',
    statusCode: StatusCodes.BAD_REQUEST
  },
  INVALID_TOKEN: {
    code: 4008,
    message: 'Invalid token',
    statusCode: StatusCodes.UNAUTHORIZED
  },

  // Group

  GROUP_NOT_FOUND: {
    code: 5001,
    message: 'Group not found',
    statusCode: StatusCodes.NOT_FOUND
  },
  
  GROUP_NAME_ALREADY_IN_USE: {
    code: 5002,
    message: 'Group name already in use',
    statusCode: StatusCodes.CONFLICT
  },

  // Conversation & message

  CONVERSATION_NOT_FOUND: {
    code: 6001,
    message: 'Conversation not found',
    statusCode: StatusCodes.NOT_FOUND
  }

} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
