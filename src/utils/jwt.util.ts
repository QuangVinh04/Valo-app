import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';

import { ErrorCode } from '../constants/error-code.js';
import AppError from './app-error.js';
import env from '../config/env.js';

interface UserPayload {
  id: string;
  permissions?: string[];
}

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  permissions: string[];
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

const secret: Secret = env.JWT_SECRET as Secret;




export function generateAccessToken(user: UserPayload): string {
  const payload = {
    userId: user.id,
    permissions: user.permissions ?? []
  };
  const options: SignOptions = {
    expiresIn: env.JWT_VALID_DURATION,
    algorithm: 'HS256' };
  
  return jwt.sign(payload, secret, options);
}


export function generateRefreshToken(user: UserPayload): string {
 
  const payload = { 
    userId: user.id
  };
  const options: SignOptions = { 
    expiresIn: env.JWT_REFRESH_DURATION, 
    algorithm: 'HS256' };
  
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;
    return decoded;
  } catch {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, secret) as RefreshTokenPayload;
    return decoded;
  } catch {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
  }
}
