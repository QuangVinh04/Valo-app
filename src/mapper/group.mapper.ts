import type { GroupDetail, GroupListItem, GroupMembers } from '../repositories/group.repository.js';
import type { GroupListItemDto, GroupMemberDto, GroupResponseDto } from '../types/group.type.js';

export class GroupMapper {
    static toGroupResponseDto(group: GroupDetail): GroupResponseDto {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            permissions: group.groupPermissions.map((perm) => perm.permissionKey),
            memberCount: group._count.userGroups,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
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
