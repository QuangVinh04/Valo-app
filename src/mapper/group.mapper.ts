import { Group } from '@prisma/client/wasm';
import type { GroupDetail, GroupListItem, GroupMembers } from '../repositories/group.repository.js';
import type { GroupListItemDto, GroupMemberDto, GroupResponseDto, UpdateGroupResponseDto } from '../types/group.type.js';

export class GroupMapper {
    static toGroupResponseDto(group: GroupDetail): GroupResponseDto {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            permissions: group.permissions,
            memberCount: group._count.userGroups,
        };
    }

    static toUpdateGroupResponseDto(group: Group): UpdateGroupResponseDto {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            permissions: group.permissions
        };
    }

    static toGroupMemberResponseDto(group: GroupMembers): GroupMemberDto {
        return {
            id: group.id,
            name: group.name,
            memberCount: group.userGroups.length,
            members: group.userGroups.map((ug) => ({
                id: ug.user.id,
                fullName: ug.user.fullName,
                email: ug.user.email,
            })),
        };
    }


    static toGroupListItemDto(group: GroupListItem): GroupListItemDto {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group._count.userGroups,
        };
    }

}
