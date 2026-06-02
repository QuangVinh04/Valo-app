import { Prisma, PrismaClient, Role } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateMessageInput {
  conversationId: string;
  content: string;
  senderType: Role;
  modelName?: string;
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

  async findRecentByConversationId(conversationId: string, take = 10) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return messages.reverse();
  }
}

export default MessageRepository;
