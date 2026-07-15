import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';
import type { AttachmentResponseDto, FileUploadDto } from '../types/upload.type.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class AttachmentRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async createMany(
    userId: string,
    fileUploads: FileUploadDto[],
    messageId?: string
  ): Promise<number> {
    if (!fileUploads.length) return 0;

    const result = await this.prisma.attachment.createMany({
      data: fileUploads.map((file) => ({
        userId,
        messageId,
        fileName: file.name,
        mimeType: file.mime ?? 'application/octet-stream',
        fileUrl: file.data,
        fileSize: file.size,
      })),
    });

    return result.count;
  }

  async findManyByUserId(input: {
    userId: string;
    cursor?: string;
    take: number;
    search?: string;
  }): Promise<AttachmentResponseDto[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        userId: input.userId,
        ...(input.search
          ? {
              fileName: {
                contains: input.search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.take,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        messageId: true,
        fileName: true,
        mimeType: true,
        fileUrl: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      messageId: attachment.messageId,
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
        messageId: true,
        fileName: true,
        mimeType: true,
        fileUrl: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      messageId: attachment.messageId,
      name: attachment.fileName,
      mime: attachment.mimeType,
      url: attachment.fileUrl,
      size: attachment.fileSize,
      createdAt: attachment.createdAt,
    }));
  }

  async existsByUrlAndUserId(url: string, userId: string): Promise<boolean> {
    const count = await this.prisma.attachment.count({
      where: {
        fileUrl: url,
        userId,
      },
    });

    return count > 0;
  }

  async existsLocalFileByUserId(fileName: string, userId: string): Promise<boolean> {
    const encodedFileName = encodeURIComponent(fileName);
    const count = await this.prisma.attachment.count({
      where: {
        userId,
        OR: [
          { fileUrl: { endsWith: `/api/v1/attachments/files/${encodedFileName}` } },
          { fileUrl: { endsWith: `/api/v1/attachments/files/${fileName}` } },
        ],
      },
    });

    return count > 0;
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
