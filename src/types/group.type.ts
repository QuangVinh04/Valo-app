import { z } from 'zod';

export const groupSchema = z.object({
    name: z.string().trim().min(1, 'Group name is required'),
    description: z.string().trim().optional(),
    permissions: z.array(z.string()).optional()
});

export const updateGroupSchema = groupSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required'
);

export const groupMembersSchema = z.object({
    userIds: z.array(z.uuid()).min(1, 'At least one user is required')
});

export const bulkDeleteGroupsSchema = z.object({
    ids: z.array(z.uuid()).min(1, 'At least one group is required').max(100),
});


export type GroupRequestDto = z.infer<typeof groupSchema>;
export type UpdateGroupRequestDto = z.infer<typeof updateGroupSchema>;
export type GroupMembersRequestDto = z.infer<typeof groupMembersSchema>;
export type BulkDeleteGroupsRequestDto = z.infer<typeof bulkDeleteGroupsSchema>;

export interface GroupResponseDto {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    memberCount: number;
}

export interface UpdateGroupResponseDto {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
}




export interface GroupListItemDto {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    memberCount: number;
}

export interface GroupMemberDto {
    id: string;
    name: string;
    memberCount: number;
    members: Array<{
        id: string;
        fullName: string;
        email: string;
    }>;
}

export interface CreatedGroupDto{
    id: string;
}

export interface BulkDeleteGroupsResponseDto {
    deletedCount: number;
    notFoundIds: string[];
}
