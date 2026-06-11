import { z } from 'zod';
import { UserSettingsDto } from './user.type.js';

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase())
});

export const loginSchema = z.object({
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'password is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(8, 'newPassword must be at least 8 characters'),
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
  email: string;
  phoneNumber: string | null;
  address: string | null;
  mustChangePassword: boolean;
  accessToken: string;
  settings: UserSettingsDto;
}
