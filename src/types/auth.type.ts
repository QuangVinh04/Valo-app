import { z } from 'zod';
import { UserSettingsDto } from './user.type.js';

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase())
});

export const loginSchema = z.object({
  username: z.email('Invalid username').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'password is required')
});

const strongPasswordSchema = z
  .string()
  .min(8, 'newPassword must be at least 8 characters')
  .max(128, 'newPassword must be at most 128 characters')
  .regex(/[A-Z]/, 'newPassword must contain at least one uppercase letter')
  .regex(/[a-z]/, 'newPassword must contain at least one lowercase letter')
  .regex(/\d/, 'newPassword must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'newPassword must contain at least one symbol');


export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(8, 'confirmPassword must be at least 8 characters')
});

export type RegisterRequestDto = z.infer<typeof registerSchema>;
export type LoginRequestDto = z.infer<typeof loginSchema>;
export type ChangePasswordRequestDto = z.infer<typeof changePasswordSchema>;


export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  id: string;
  fullName: string;
  mustChangePassword: boolean;
  accessToken: string;
  settings: UserSettingsDto;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
}
