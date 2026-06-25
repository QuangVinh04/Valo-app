import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import {
  attachmentRepository,
  AttachmentRepository,
} from '../repositories/attachment.repository.js';
import type {
  AttachmentResponseDto,
  BulkDeleteAttachmentsResponseDto,
} from '../types/upload.type.js';
import type { ProcessedDocument } from './file.service.js';
import {
  buildCursorPaginatedResult,
  CursorPaginatedResult,
  CursorPaginationOptions,
} from '../utils/pagination.util.js';
import logger from '../utils/logger.util.js';

type CloudinaryResourceType = 'image' | 'raw';

export class AttachmentService {
  constructor(
    private readonly attachmentRepo: AttachmentRepository
  ) {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async getUserAttachments(
    userId: string,
    pagination: CursorPaginationOptions
  ): Promise<CursorPaginatedResult<AttachmentResponseDto>> {
    const attachments = await this.attachmentRepo.findManyByUserId({
      userId,
      cursor: pagination.cursor,
      take: pagination.limit + 1,
    });

    return buildCursorPaginatedResult(attachments, pagination.limit);
  }

  async saveMessageAttachments(
    userId: string,
    documents: ProcessedDocument[],
    messageId: string
  ): Promise<number> {
    return this.attachmentRepo.createMany(userId, documents, messageId);
  }

  async deleteUserAttachments(
    userId: string,
    attachmentIds: string[]
  ): Promise<BulkDeleteAttachmentsResponseDto> {
    const uniqueIds = [...new Set(attachmentIds)];
    const attachments = await this.attachmentRepo.findManyByIdsAndUserId(uniqueIds, userId);
    const foundIds = new Set(attachments.map((attachment) => attachment.id));
    const notFoundIds = uniqueIds.filter((id) => !foundIds.has(id));

    await Promise.all(
      attachments.map((attachment) => this.deleteCloudinaryAsset(attachment.url))
    );

    const deletedCount = await this.attachmentRepo.deleteManyByIdsAndUserId(
      attachments.map((attachment) => attachment.id),
      userId
    );

    return {
      deletedCount,
      notFoundIds,
    };
  }

  private async deleteCloudinaryAsset(url?: string | null): Promise<void> {
    const asset = this.parseCloudinaryAsset(url);
    if (!asset) return;

    try {
      await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
      });
    } catch (error) {
      logger.warn('Cloudinary asset delete failed', {
        error: error instanceof Error ? error.message : error,
        publicId: asset.publicId,
        resourceType: asset.resourceType,
      });
    }
  }

  private parseCloudinaryAsset(url?: string | null): {
    publicId: string;
    resourceType: CloudinaryResourceType;
  } | null {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const [cloudName, resourceType, deliveryType] = pathParts;

      if (
        parsedUrl.hostname !== 'res.cloudinary.com'
        || cloudName !== env.CLOUDINARY_CLOUD_NAME
        || !this.isCloudinaryResourceType(resourceType)
        || deliveryType !== 'upload'
      ) {
        return null;
      }

      const uploadIndex = pathParts.indexOf('upload');
      const publicPathParts = pathParts.slice(uploadIndex + 1);
      if (publicPathParts[0]?.startsWith('v')) {
        publicPathParts.shift();
      }

      const publicPath = publicPathParts.join('/');
      if (!publicPath) return null;

      return {
        resourceType,
        publicId: resourceType === 'image'
          ? publicPath.replace(/\.[^/.]+$/, '')
          : publicPath,
      };
    } catch {
      return null;
    }
  }

  private isCloudinaryResourceType(value: string | undefined): value is CloudinaryResourceType {
    return value === 'image' || value === 'raw';
  }
}

export const attachmentService = new AttachmentService(attachmentRepository);
