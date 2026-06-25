import type { PrismaClient } from '@prisma/client';
import { PermissionConstant } from '../../constants/permission.constant.js';
import { GroupRepository } from '../../repositories/group.repository.js';

export async function seedGroups(prisma: PrismaClient): Promise<void> {
    const groupRepository = new GroupRepository(prisma);

    const adminGroup = await groupRepository.findByName('admin');
    if (!adminGroup) {

        const adminPermissionKeys = PermissionConstant.ALL.map((item) => item.key);
        await groupRepository.createGroup({
            name: 'admin',
            description: 'Administrators with full access',
            permissions: adminPermissionKeys
        });
    }

    const userGroup = await groupRepository.findByName('user');
    if (!userGroup) {

        const userPermissionKeys = [
            PermissionConstant.CHAT.key,
            PermissionConstant.CONV_CREATE.key,
            PermissionConstant.CONV_READ.key,
            PermissionConstant.CONV_UPDATE.key,
            PermissionConstant.CONV_DELETE.key
        ];
        await groupRepository.createGroup({
            name: 'user',
            description: 'Regular users with limited access',
            permissions: userPermissionKeys
        });

    }


}
