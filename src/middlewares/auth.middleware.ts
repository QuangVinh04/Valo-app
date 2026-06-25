import type { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../constants/error-code.js';
import { userRepository } from '../repositories/user.repository.js';
import AppError from '../utils/app-error.js';
import { verifyToken } from '../utils/jwt.util.js';


//TODO: Bkav HoanNTh: Không dùng singleton?
// Bkav VinhTQ: Done

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authorization header missing or malformed');
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = verifyToken(accessToken);

    if (!payload.userId || typeof payload.userId !== 'string') {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token payload');
    }

    req.user = {
      userId: payload.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export function authorize(...requiredPermissions: string[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction): Promise<void> => {
    try {
      const permissions = await userRepository.findPermissionKeysByUserId(req.user.userId);
      if (!permissions || !Array.isArray(permissions)) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Access denied. No permissions found.');
      }

      const hasPermission = requiredPermissions.every(permission => permissions.includes(permission));
      if (!hasPermission) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Access denied. Insufficient permissions.');
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

export function authorizeSelfOrPermission(
  userIdParamName: string,
  permission: string
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction): Promise<void> => {
    try {
      if (req.params[userIdParamName] === req.user.userId) {
        next();
        return;
      }

      const permissions = await userRepository.findPermissionKeysByUserId(req.user.userId);
      if (!permissions || !Array.isArray(permissions)) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Access denied. No permissions found.');
      }

      if (permissions.includes(permission)) {
        next();
        return;
      }

      throw new AppError(ErrorCode.FORBIDDEN, 'Access denied. Insufficient permissions.');
    } catch (error) {
      next(error);
    }
  };
}

export default { authenticate, authorize, authorizeSelfOrPermission };
