import { z } from 'zod';
import type { UserResponseDto } from './user.type.js';

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
export type RegisterResponseDto = UserResponseDto;
export type LoginRequestDto = z.infer<typeof loginSchema>;
export type ChangePasswordRequestDto = z.infer<typeof changePasswordSchema>;

export type UserSettingsDto = {
  theme: 'dark' | 'light';
  language: 'vi' | 'en';
};

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
  }>;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  accessToken: string | null;
  permissions: string[];
  settings: UserSettingsDto;
}
