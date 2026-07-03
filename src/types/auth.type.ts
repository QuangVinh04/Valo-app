import { z } from 'zod';
import { UserSettingsDto } from './user.type.js';

const strongPasswordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(128, 'password must be at most 128 characters')
  .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'password must contain at least one lowercase letter')
  .regex(/\d/, 'password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'password must contain at least one symbol');

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  password: strongPasswordSchema,
  confirmPassword: z.string().min(8, 'confirmPassword must be at least 8 characters'),
}).refine(
  (value) => value.password === value.confirmPassword,
  {
    message: 'password and confirmPassword do not match',
    path: ['confirmPassword'],
  }
);

export const loginSchema = z.object({
  username: z.email('Invalid username').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'password is required')
});

export const otpSchema = z.object({
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  otp: z.string().trim().regex(/^\d{4,8}$/, 'Invalid OTP'),
});

export const resendOtpSchema = otpSchema.pick({ email: true });


export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(8, 'confirmPassword must be at least 8 characters')
});

export type RegisterRequestDto = z.infer<typeof registerSchema>;
export type LoginRequestDto = z.infer<typeof loginSchema>;
export type OtpRequestDto = z.infer<typeof otpSchema>;
export type ResendOtpRequestDto = z.infer<typeof resendOtpSchema>;
export type ChangePasswordRequestDto = z.infer<typeof changePasswordSchema>;



export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  accessToken: string | null;
  settings: UserSettingsDto;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
}
