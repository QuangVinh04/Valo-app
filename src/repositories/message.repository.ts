import { Message, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;
export type MessageStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface CreateMessageInput {
  conversationId: string;
  content: string;
  senderType: 'user' | 'assistant' | 'system';
  status?: MessageStatus;
  modelName?: string | null;
  isUserStopped: boolean;
  parentMessageId: string;
  ancestors: string[];
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
        parentMessageId: input.parentMessageId,
        status: input.status ?? (input.senderType === 'user' ? 'PENDING' : 'SUCCESS'),
        modelName: input.modelName ?? null,
        isUserStopped: input.isUserStopped,
        ancestors: input.ancestors
      }
    });
  }
  async findRecentBranchHistory(
    targetMessageId: string,
    ancestorIds: string[],
    limit = 10
  ): Promise<Pick<Message, 'senderType' | 'content'>[]> {
    // Gộp mảng tổ tiên và id hiện tại thành chuỗi IDs đầy đủ của nhánh
    const fullBranchIds = [...ancestorIds, targetMessageId];

    // Lấy đúng số lượng tin nhắn mới nhất bằng phương pháp LIMIT + ORDER BY DESC
    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: fullBranchIds },
        status: 'SUCCESS'
      },
      select: {
        senderType: true,
        content: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return messages.reverse();
  }

  async findAncestorIds(id: string): Promise<string[] | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
      select: { ancestors: true }
    });
    return message ? message.ancestors : null;
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
            fileSize: true
          }
        }
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' }
      ]
    });
  }

  async updateContentAndStatus(
    messageId: string,
    content: string,
    status: MessageStatus,
    isUserStopped = false
  ) {
    const client = this.prisma as PrismaClient;

    return client.$transaction(async (tx) => {
      const message = await tx.message.update({
        where: { id: messageId },
        data: { content, status, isUserStopped }
      });

      await tx.conversation.update({
        where: { id: message.conversationId },
        data: { updatedAt: new Date() }
      });

      return message;
    });
  }

  async findById(messageId: string) {
    return this.prisma.message.findUnique({
      where: { id: messageId }
    });
  }
}

export const messageRepository = new MessageRepository(PrismaService.getInstance().client);
