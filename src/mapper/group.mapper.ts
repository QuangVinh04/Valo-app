import type { GroupFull} from '../repositories/group.repository.js';
import type { GroupResponseDto } from '../types/group.type.js';

export class GroupMapper {
    static toGroupResponseDto(group: GroupFull): GroupResponseDto {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            permissions: group.groupPermissions.map((perm) => perm.permissionKey),
            memberCount: group.userGroups.length,
            members: group.userGroups.map(({ user }) => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email
            })),
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        };
    }
}
