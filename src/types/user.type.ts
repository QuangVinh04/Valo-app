import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.email('Invalid email').transform((value) => value.trim().toLowerCase()),
  groupIds: z.array(z.uuid()).min(1, 'At least one group is required').optional()
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').optional(),
  groupIds: z.array(z.uuid()).min(1, 'At least one group is required').optional()
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export type CreateUserRequestDto = z.infer<typeof createUserSchema>;
export type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;

export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
