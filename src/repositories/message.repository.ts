import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateMessageInput {
  conversationId: string;
  content: string;
  senderType: 'user' | 'assistant' | 'system';
  modelName?: string | null;
}

export class MessageRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async create(input: CreateMessageInput) {
    return this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        content: input.content,
        senderType: input.senderType,
        modelName: input.modelName ?? null,
      },
    });
  }

  async findManyByConversationId(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        attachments: {
          orderBy: { createdAt: 'asc' },
          select: {
            fileName: true,
            mimeType: true,
            fileUrl: true,
            fileSize: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findRecentByConversationId(conversationId: string, take = 10) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return messages.reverse();
  }
}

export const messageRepository = new MessageRepository(
  PrismaService.getInstance().client
);

export default MessageRepository;
