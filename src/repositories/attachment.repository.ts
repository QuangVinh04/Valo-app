import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';
import type { ProcessedDocument } from '../services/file.service.js';
import type { AttachmentResponseDto } from '../types/upload.type.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class AttachmentRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async createMany(
    userId: string,
    documents: ProcessedDocument[]
  ): Promise<number> {
    if (!documents.length) return 0;

    const result = await this.prisma.attachment.createMany({
      data: documents.map((document) => ({
        userId,
        fileName: document.name,
        mimeType: document.mime,
        fileUrl: document.url,
        fileSize: document.size,
        extractedText: document.text,
      })),
    });

    return result.count;
  }

  async findManyByUserId(input: {
    userId: string;
    cursor?: string;
    take: number;
  }): Promise<AttachmentResponseDto[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        userId: input.userId,
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.take,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileUrl: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.fileName,
      mime: attachment.mimeType,
      url: attachment.fileUrl,
      size: attachment.fileSize,
      createdAt: attachment.createdAt,
    }));
  }

  async findManyByIdsAndUserId(ids: string[], userId: string): Promise<AttachmentResponseDto[]> {
    if (!ids.length) return [];

    const attachments = await this.prisma.attachment.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileUrl: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.fileName,
      mime: attachment.mimeType,
      url: attachment.fileUrl,
      size: attachment.fileSize,
      createdAt: attachment.createdAt,
    }));
  }


  async deleteManyByIdsAndUserId(ids: string[], userId: string): Promise<number> {
    if (!ids.length) return 0;

    const result = await this.prisma.attachment.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return result.count;
  }
}

const prismaService = PrismaService.getInstance();
export const attachmentRepository = new AttachmentRepository(prismaService.client);
