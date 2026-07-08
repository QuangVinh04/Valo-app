import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;
export type MessageStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface CreateMessageInput {
  conversationId: string;
  content: string;
  senderType: 'user' | 'assistant' | 'system';
  status?: MessageStatus;
  modelName?: string | null;
}

export class MessageRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async create(input: CreateMessageInput) {
    const client = this.prisma as PrismaClient
    return await client.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          content: input.content,
          senderType: input.senderType,
          status: input.status ?? (input.senderType === 'user' ? 'PENDING' : 'SUCCESS'),
          modelName: input.modelName ?? null
        }
      });

      await tx.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() }
      });

      return message;
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

  async updateStatus(messageId: string, status: MessageStatus) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status },
    });
  }

  async findById(messageId: string) {
    return this.prisma.message.findUnique({
      where: { id: messageId},
    })

  }
}

export const messageRepository = new MessageRepository(
  PrismaService.getInstance().client
);

export default MessageRepository;
