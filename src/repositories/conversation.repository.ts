import { PrismaClient, Prisma, Conversation } from "@prisma/client";



type DbClient = PrismaClient | Prisma.TransactionClient;

const conversationInclude = {
  messages: true,
} satisfies Prisma.ConversationInclude;

export type ConversationFull = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export interface CreateConversationInput {
  title: string;
  modelName: string;
  userId: string;
}

export interface UpdateConversationInput {
  title?: string;
  modelName?: string;
}

export class ConversationRepository {

  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }


  async create(conversation: CreateConversationInput): Promise<ConversationFull> {

    return this.prisma.conversation.create({
      data: {
        title: conversation.title,
        modelName: conversation.modelName,
        userId: conversation.userId,
      },
      include: conversationInclude
    });
  }

  async getById(id: string): Promise<ConversationFull | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });
  }

  async update(id: string, updates: UpdateConversationInput): Promise<ConversationFull | null> {
    return this.prisma.conversation.update({
      where: { id },
      data: updates,
      include: conversationInclude
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.conversation.delete({
      where: { id },
    });
    return true;
  }

  async findMany(input: { userId: string; skip: number; take: number }): Promise<ConversationFull[]> {
    return this.prisma.conversation.findMany({
      where: { userId: input.userId },
      skip: input.skip,
      take: input.take,
      include: conversationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(userId: string): Promise<number> {
    return this.prisma.conversation.count({
      where: { userId },
    });
  }

}
