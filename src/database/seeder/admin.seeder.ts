import type { PrismaClient } from '@prisma/client';
import { groupRepository } from '../../repositories/group.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { hashString } from '../../utils/auth.util.js';
import logger from '../../utils/logger.util.js';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const DEFAULT_ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'System Administrator';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

export async function seedAdmin(prisma: PrismaClient): Promise<void> {


  const adminGroup = await groupRepository.findByName('admin');
  if (!adminGroup) {
    throw new Error('Admin group not found. Please run group seeder first.');
  }

  const adminCount = await groupRepository.countUsers(adminGroup.id);
  if (adminCount > 0) {
    return;
  }

  const email = DEFAULT_ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    await prisma.userGroup.create({
      data: {
        userId: existingUser.id,
        groupId: adminGroup.id
      }
    });
    logger.info('Existing user assigned to default admin group', { email });
    return;
  }

  const user = await userRepository.createUser({
    fullName: DEFAULT_ADMIN_FULL_NAME.trim(),
    email,
    password: await hashString(DEFAULT_ADMIN_PASSWORD),
    mustChangePassword: true,
  });

  await userRepository.assignGroups(user.id, [adminGroup.id]);
  

  logger.info('Default admin user created', { email });
}
