import {
  attachmentRepository,
  AttachmentRepository,
} from '../repositories/attachment.repository.js';
import type {
  AttachmentResponseDto,
  BulkDeleteAttachmentsResponseDto,
  FileUploadDto,
  LocalFileUploadRequestDto,
  UploadedFileDeleteResponseDto,
} from '../types/upload.type.js';
import type { ProcessedDocument } from './file.service.js';
import {
  buildCursorPaginatedResult,
  CursorPaginatedResult,
  CursorPaginationOptions,
} from '../utils/pagination.util.js';
import logger from '../utils/logger.util.js';
import type { Request } from 'express';
import { cloudinaryService, CloudinaryService } from './cloudinary.service.js';
import { localStorageService, LocalStorageService } from './local-storage.service.js';
import { ErrorCode } from '../constants/error-code.js';
import AppError from '../utils/app-error.js';

export class AttachmentService {
  constructor(
    private readonly attachmentRepo: AttachmentRepository,
    private readonly localStorage: LocalStorageService,
    private readonly cloudinaryStorage: CloudinaryService
  ) {}

  async getUserAttachments(
    userId: string,
    pagination: CursorPaginationOptions,
    filters: { search?: string } = {}
  ): Promise<CursorPaginatedResult<AttachmentResponseDto>> {
    const attachments = await this.attachmentRepo.findManyByUserId({
      userId,
      cursor: pagination.cursor,
      take: pagination.limit + 1,
      search: filters.search,
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

  async uploadLocalFile(
    req: Request,
    payload: LocalFileUploadRequestDto
  ): Promise<FileUploadDto> {
    return this.localStorage.uploadFile(req, payload);
  }

  async deleteTemporaryUpload(
    userId: string,
    url: string
  ): Promise<UploadedFileDeleteResponseDto> {
    const isSavedAttachment = await this.attachmentRepo.existsByUrlAndUserId(url, userId);
    if (isSavedAttachment) {
      return { deleted: false };
    }

    await this.deleteStoredAsset(url);

    return { deleted: true };
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
      attachments.map((attachment) => this.deleteStoredAsset(attachment.url))
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

  async assertLocalFileAccess(userId: string, fileName: string): Promise<void> {
    const hasAccess = await this.attachmentRepo.existsLocalFileByUserId(fileName, userId);

    if (!hasAccess) {
      throw new AppError(ErrorCode.ROUTE_NOT_FOUND);
    }
  }

  private async deleteStoredAsset(url?: string | null): Promise<void> {
    try {
      await this.localStorage.deleteFileFromUrl(url);
    } catch (error) {
      logger.warn('Local attachment delete failed', {
        error: error instanceof Error ? error.message : error,
        url,
      });
    }

    await this.cloudinaryStorage.deleteAsset(url);
  }
}

export const attachmentService = new AttachmentService(
  attachmentRepository,
  localStorageService,
  cloudinaryService
);
