import { PrismaClient, Prisma, Conversation } from "@prisma/client";
import { PrismaService } from "../config/prisma.js";



type DbClient = PrismaClient | Prisma.TransactionClient;

const conversationDetailSelect = {
  id: true,
  title: true,
  modelName: true,
  chatId: true,
  sessionId: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;


export type ConversationDetail = Prisma.ConversationGetPayload<{
  select: typeof conversationDetailSelect;
}>;

export type ConversationSummary = Pick<Conversation, 'id' | 'title' | 'updatedAt'>;


export interface CreateConversationInput {
  title: string;
  modelName: string;
  userId: string;
}

export interface UpdateConversationInput {
  title?: string;
  modelName?: string;
  chatId?: string;
  sessionId?: string;
}

export class ConversationRepository {

  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }


  async create(conversation: CreateConversationInput): Promise<ConversationDetail> {

    return this.prisma.conversation.create({
      data: {
        title: conversation.title,
        modelName: conversation.modelName,
        userId: conversation.userId,
      },
      select: conversationDetailSelect
    });
  }

  async getById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
    });
  }

  async getByIdAndUserId(id: string, userId: string): Promise<ConversationDetail | null> {
    return this.prisma.conversation.findFirst({
      where: { id, userId },
      select: conversationDetailSelect
    });
  }


 async update(id: string, updates: UpdateConversationInput): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: updates
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
  }): Promise<ConversationSummary[]> {
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
      select: {
        id: true,
        title: true,
        updatedAt: true
      },
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


const prismaService = PrismaService.getInstance();
export const conversationRepository = new ConversationRepository(prismaService.client);
