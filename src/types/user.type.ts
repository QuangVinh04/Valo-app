import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  phoneNumber: z.string().trim().max(32, 'phoneNumber is too long').optional(),
  address: z.string().trim().max(255, 'address is too long').optional(),
  groupIds: z.array(z.uuid()).min(1, 'At least one group is required').optional()
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').optional(),
  phoneNumber: z.string().trim().max(32, 'phoneNumber is too long').optional(),
  address: z.string().trim().max(255, 'address is too long').optional(),
  groupIds: z.array(z.uuid()).min(1, 'At least one group is required').optional()
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export type CreateUserRequestDto = z.infer<typeof createUserSchema>;
export type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;

export const UserSettingsSchema = z.object({
  theme: z.enum(['dark', 'light']),
  language: z.enum(['vi', 'en'])
});

export type UserSettingsDto = z.infer<typeof UserSettingsSchema>;




export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
