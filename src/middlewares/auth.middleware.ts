import type { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../constants/error-code.js';
import { userRepository } from '../repositories/user.repository.js';
import AppError from '../utils/app-error.js';
import { verifyToken } from '../utils/jwt.util.js';
import { redisService } from '../services/redis.service.js';


//TODO: Bkav HoanNTh: Không dùng singleton?
//FIXME: Bkav VinhTQ: Done



export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    accessToken: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authorization header missing or malformed');
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = verifyToken(accessToken);
    const jwtid = payload.jti;

    if(jwtid){
      const blacklistKey = `auth:blacklist:${jwtid}`;
      const isBlacklisted = await redisService.exists(blacklistKey);
      if(isBlacklisted){
        throw new AppError(ErrorCode.UNAUTHORIZED);
      }
    }

    if (!payload.userId || typeof payload.userId !== 'string') {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token payload');
    }

    req.user = {
      userId: payload.userId,
      accessToken: accessToken
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
