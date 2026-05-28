import type { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.util.js';
import { seedAdmin } from './admin.seeder.js';
import { seedGroups } from './group.seeder.js';

export async function runDatabaseSeeders(prisma: PrismaClient): Promise<void> {
  await seedGroups(prisma);
  await seedAdmin(prisma);
  logger.info('Database seeders completed');
}
