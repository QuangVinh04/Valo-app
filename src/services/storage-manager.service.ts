import type { Request } from 'express';
import type { FileUploadDto } from '../types/upload.type.js';
import logger from '../utils/logger.util.js';
import { cloudinaryService, CloudinaryService } from './cloudinary.service.js';
import { localStorageService, LocalStorageService } from './local-storage.service.js';

interface StorageUploadInput {
  req: Request;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  uploadId: string;
}

interface StorageProvider {
  upload(input: StorageUploadInput): Promise<FileUploadDto>;
}

class CloudinaryStorageProvider implements StorageProvider {
  constructor(private readonly cloudinary: CloudinaryService) {}

  async upload(input: StorageUploadInput): Promise<FileUploadDto> {
    const result = await this.cloudinary.uploadFile({
      filePath: input.filePath,
      fileName: input.fileName,
      userId: input.userId,
      uploadId: input.uploadId,
    });

    return {
      data: result.fileUrl,
      name: input.fileName,
      type: 'url',
      mime: input.mimeType,
      size: input.fileSize,
    };
  }
}

class LocalStorageProvider implements StorageProvider {
  constructor(private readonly localStorage: LocalStorageService) {}

  async upload(input: StorageUploadInput): Promise<FileUploadDto> {
    return this.localStorage.uploadFileFromPath(input.req, {
      sourcePath: input.filePath,
      originalName: input.fileName,
      mime: input.mimeType,
      size: input.fileSize,
    });
  }
}

export class StorageManager {
  constructor(
    private readonly cloudinaryProvider: StorageProvider,
    private readonly localProvider: StorageProvider
  ) {}

  async upload(input: StorageUploadInput): Promise<FileUploadDto> {
    try {
      return await this.cloudinaryProvider.upload(input);
    } catch (error) {
      if (!this.shouldFallbackToLocal(error)) {
        throw error;
      }

      logger.warn('Cloudinary upload failed, using local storage', {
        uploadId: input.uploadId,
        userId: input.userId,
        fileName: input.fileName,
        error: error instanceof Error ? error.message : error,
      });

      return this.localProvider.upload(input);
    }
  }

  private shouldFallbackToLocal(error: unknown): boolean {
    const cloudinaryError = error as { http_code?: number };
    const status = cloudinaryError.http_code;

    return !status
      || status === 408
      || status === 429
      || status >= 500;
  }
}

export const storageManager = new StorageManager(
  new CloudinaryStorageProvider(cloudinaryService),
  new LocalStorageProvider(localStorageService)
);
