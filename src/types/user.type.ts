import { z } from 'zod';

const strongPasswordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(128, 'password must be at most 128 characters')
  .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'password must contain at least one lowercase letter')
  .regex(/\d/, 'password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'password must contain at least one symbol');

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  password: strongPasswordSchema,
  confirmPassword: z.string().min(8, 'confirmPassword must be at least 8 characters'),
  phoneNumber: z.string().trim().max(32, 'phoneNumber is too long').optional(),
  address: z.string().trim().max(255, 'address is too long').optional(),
}).refine(
  (value) => value.password === value.confirmPassword,
  {
    message: 'password and confirmPassword do not match',
    path: ['confirmPassword'],
  }
);

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').optional(),
  phoneNumber: z.string().trim().max(32, 'phoneNumber is too long').optional(),
  address: z.string().trim().max(255, 'address is too long').optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export const assignUserGroupsSchema = z.object({
  groupIds: z.array(z.uuid()).min(1, 'At least one group is required')
});

export const bulkDeleteUsersSchema = z.object({
  ids: z.array(z.uuid()).min(1, 'At least one user is required').max(100),
});

export type CreateUserRequestDto = z.infer<typeof createUserSchema>;
export type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;
export type AssignUserGroupsRequestDto = z.infer<typeof assignUserGroupsSchema>;
export type BulkDeleteUsersRequestDto = z.infer<typeof bulkDeleteUsersSchema>;

export const UserSettingsSchema = z.object({
  theme: z.enum(['dark', 'light']),
  language: z.enum(['vi', 'en'])
});

export const updateUserSettingsSchema = UserSettingsSchema;

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
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItemDto {
  id: string;
  fullName: string;
  email: string;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  active: boolean;
}

export interface CreatedUserDto {
  id: string;
}

export interface UserUpdateResponseDto {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
}

export interface BulkDeleteUsersResponseDto {
  deletedCount: number;
  notFoundIds: string[];
}
