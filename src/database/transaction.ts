import type { Prisma } from '@prisma/client';

import { PrismaService } from '../config/prisma.js';

const prisma = PrismaService.getInstance().client;

export async function withTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return callback(tx);
  });
}