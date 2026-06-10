import { PrismaClient, Prisma, Conversation } from "@prisma/client";



type DbClient = PrismaClient | Prisma.TransactionClient;

const conversationInclude = {
  messages: {
    orderBy: {
      createdAt: 'asc'
    },
  },
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

  async getById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
    });
  }

  async getByIdForUser(id: string): Promise<ConversationFull | null> {
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


  async deleteManyByUserId(userId: string): Promise<number> {
    const result = await this.prisma.conversation.deleteMany({
      where: { userId },
    });

    return result.count;
  }



  async findManyCursor(input: {
    userId: string;
    cursor?: string;
    take: number;
  }): Promise<Conversation[]> {
    const cursor = input.cursor
      ? await this.prisma.conversation.findFirst({
        where: { id: input.cursor, userId: input.userId },
        select: {
          id: true,
          updatedAt: true
        }
      })
      : null;

    if (input.cursor && !cursor) {
      return [];
    }

    return this.prisma.conversation.findMany({
      where: {
        userId: input.userId,
        ...(cursor
          ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              {
                updatedAt: cursor.updatedAt,
                id: { lt: cursor.id }
              }
            ]
          }
          : {})
      },
      take: input.take,
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ],
    });
  }


}
