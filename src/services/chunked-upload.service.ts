import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Request } from 'express';
import { ErrorCode } from '../constants/error-code.js';
import {
  SUPPORTED_UPLOAD_EXTENSIONS,
  SUPPORTED_UPLOAD_MIME_TYPES,
  UPLOAD_CONFIG,
} from '../constants/upload.constant.js';
import env from '../config/env.js';
import type {
  ChunkUploadSessionDto,
  ChunkUploadStatusDto,
  FileUploadDto,
  InitializeChunkUploadRequestDto,
} from '../types/upload.type.js';
import AppError from '../utils/app-error.js';
import { redisService, RedisService } from './redis.service.js';
import { storageManager, StorageManager } from './storage-manager.service.js';

type UploadSessionStatus =
  | 'INITIALIZED'
  | 'UPLOADING'
  | 'ASSEMBLING'
  | 'STORING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

interface UploadSession {
  uploadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: UploadSessionStatus;
  createdAt: string;
  expiresAt: string;
}

export class ChunkedUploadService {
  constructor(
    private readonly redis: RedisService,
    private readonly storage: StorageManager
  ) {}

  async initializeUpload(
    userId: string,
    payload: InitializeChunkUploadRequestDto
  ): Promise<ChunkUploadSessionDto> {
    this.assertSupportedFile(payload.fileName, payload.mimeType);

    const expectedTotalChunks = Math.ceil(payload.fileSize / payload.chunkSize);
    if (payload.totalChunks !== expectedTotalChunks) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid totalChunks for fileSize and chunkSize');
    }

    const uploadId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + UPLOAD_CONFIG.SESSION_TTL_SECONDS * 1000).toISOString();
    const session: UploadSession = {
      uploadId,
      userId,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      totalSize: payload.fileSize,
      chunkSize: payload.chunkSize,
      totalChunks: payload.totalChunks,
      uploadedChunks: [],
      status: 'INITIALIZED',
      createdAt: now.toISOString(),
      expiresAt,
    };

    await fs.mkdir(this.getSessionDir(userId, uploadId), { recursive: true });
    await this.saveSession(session);

    return {
      uploadId,
      chunkSize: payload.chunkSize,
      uploadedChunks: [],
      expiresAt,
    };
  }

  async uploadChunk(input: {
    userId: string;
    uploadId: string;
    chunkIndex: number;
    file?: Express.Multer.File;
  }): Promise<ChunkUploadStatusDto> {
    if (!input.file) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Missing chunk file');
    }

    const session = await this.getOwnedSession(input.userId, input.uploadId);
    this.assertWritableSession(session);
    this.assertChunk(input.chunkIndex, input.file.buffer.length, session);

    const chunkPath = this.getChunkPath(session, input.chunkIndex);
    const tempPath = `${chunkPath}.tmp`;

    await fs.mkdir(this.getSessionDir(session.userId, session.uploadId), { recursive: true });
    await fs.writeFile(tempPath, input.file.buffer);
    await fs.rename(tempPath, chunkPath);

    session.uploadedChunks = Array.from(new Set([
      ...session.uploadedChunks,
      input.chunkIndex,
    ])).sort((left, right) => left - right);
    session.status = 'UPLOADING';
    await this.saveSession(session);

    return this.toStatusDto(session);
  }

  async getUploadStatus(userId: string, uploadId: string): Promise<ChunkUploadStatusDto> {
    const session = await this.getOwnedSession(userId, uploadId);

    return this.toStatusDto(session);
  }

  async completeUpload(req: Request, userId: string, uploadId: string): Promise<FileUploadDto> {
    const lockKey = `upload:complete:lock:${uploadId}`;
    const lockAcquired = await this.redis.acquireLock(
      lockKey,
      randomUUID(),
      UPLOAD_CONFIG.COMPLETE_LOCK_TTL_SECONDS
    );

    if (!lockAcquired) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Upload completion is already in progress');
    }

    const session = await this.getOwnedSession(userId, uploadId);

    try {
      this.assertComplete(session);
      session.status = 'ASSEMBLING';
      await this.saveSession(session);

      const assembledPath = await this.assembleFile(session);
      const assembledStat = await fs.stat(assembledPath);

      if (assembledStat.size !== session.totalSize) {
        throw new AppError(ErrorCode.BAD_REQUEST, 'Assembled file size does not match upload session');
      }

      session.status = 'STORING';
      await this.saveSession(session);

      const fileUpload = await this.storage.upload({
        req,
        filePath: assembledPath,
        fileName: session.fileName,
        mimeType: session.mimeType,
        fileSize: session.totalSize,
        userId,
        uploadId,
      });

      session.status = 'COMPLETED';
      await this.saveSession(session);
      await this.cleanupSessionFiles(session);
      await this.redis.delete(this.getSessionKey(uploadId));

      return fileUpload;
    } catch (error) {
      session.status = 'FAILED';
      await this.saveSession(session).catch(() => undefined);
      throw error;
    } finally {
      await this.redis.delete(lockKey).catch(() => undefined);
    }
  }

  async cancelUpload(userId: string, uploadId: string): Promise<void> {
    const session = await this.getSession(uploadId);
    if (!session) return;
    if (session.userId !== userId) {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    session.status = 'CANCELLED';
    await this.saveSession(session).catch(() => undefined);
    await this.cleanupSessionFiles(session);
    await this.redis.delete(this.getSessionKey(uploadId));
  }

  private assertSupportedFile(fileName: string, mimeType: string): void {
    const extension = path.extname(fileName).toLowerCase();
    if (
      !SUPPORTED_UPLOAD_EXTENSIONS.has(extension)
      || !SUPPORTED_UPLOAD_MIME_TYPES.has(mimeType)
    ) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Unsupported file type');
    }
  }

  private assertWritableSession(session: UploadSession): void {
    if (['ASSEMBLING', 'STORING', 'COMPLETED', 'CANCELLED'].includes(session.status)) {
      throw new AppError(ErrorCode.BAD_REQUEST, `Upload session is ${session.status}`);
    }
  }

  private assertChunk(chunkIndex: number, chunkSize: number, session: UploadSession): void {
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid chunk index');
    }

    const expectedSize = chunkIndex === session.totalChunks - 1
      ? session.totalSize - session.chunkSize * (session.totalChunks - 1)
      : session.chunkSize;

    if (chunkSize !== expectedSize) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid chunk size');
    }
  }

  private assertComplete(session: UploadSession): void {
    const uploaded = new Set(session.uploadedChunks);
    const missing = Array.from({ length: session.totalChunks }, (_, index) => index)
      .filter((index) => !uploaded.has(index));

    if (missing.length) {
      throw new AppError(ErrorCode.BAD_REQUEST, `Missing chunks: ${missing.join(', ')}`);
    }
  }

  private async assembleFile(session: UploadSession): Promise<string> {
    const assembledPath = path.join(this.getSessionDir(session.userId, session.uploadId), 'assembled.tmp');
    await fs.rm(assembledPath, { force: true });

    const handle = await fs.open(assembledPath, 'w');
    try {
      for (let index = 0; index < session.totalChunks; index += 1) {
        const chunk = await fs.readFile(this.getChunkPath(session, index));
        await handle.write(chunk);
      }
    } finally {
      await handle.close();
    }

    return assembledPath;
  }

  private async getOwnedSession(userId: string, uploadId: string): Promise<UploadSession> {
    const session = await this.getSession(uploadId);
    if (!session) {
      throw new AppError(ErrorCode.ROUTE_NOT_FOUND, 'Upload session not found');
    }

    if (session.userId !== userId) {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.cleanupSessionFiles(session).catch(() => undefined);
      await this.redis.delete(this.getSessionKey(uploadId)).catch(() => undefined);
      throw new AppError(ErrorCode.BAD_REQUEST, 'Upload session expired');
    }

    return session;
  }

  private async getSession(uploadId: string): Promise<UploadSession | null> {
    return this.redis.get<UploadSession>(this.getSessionKey(uploadId));
  }

  private async saveSession(session: UploadSession): Promise<void> {
    await this.redis.set(
      this.getSessionKey(session.uploadId),
      session,
      UPLOAD_CONFIG.SESSION_TTL_SECONDS
    );
  }

  private toStatusDto(session: UploadSession): ChunkUploadStatusDto {
    const uploaded = new Set(session.uploadedChunks);
    const missingChunks = Array.from({ length: session.totalChunks }, (_, index) => index)
      .filter((index) => !uploaded.has(index));

    return {
      uploadId: session.uploadId,
      status: session.status,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks,
      missingChunks,
    };
  }

  private getSessionKey(uploadId: string): string {
    return `upload:session:${uploadId}`;
  }

  private getChunkPath(session: UploadSession, chunkIndex: number): string {
    return path.join(this.getSessionDir(session.userId, session.uploadId), `${chunkIndex}.part`);
  }

  private getSessionDir(userId: string, uploadId: string): string {
    return path.join(this.getTemporaryRoot(), path.basename(userId), path.basename(uploadId));
  }

  private getTemporaryRoot(): string {
    const storageDir = env.LOCAL_FILE_STORAGE_DIR || path.join(process.cwd(), 'data', 'uploads');

    return path.join(storageDir, 'temporary');
  }

  private async cleanupSessionFiles(session: UploadSession): Promise<void> {
    await fs.rm(this.getSessionDir(session.userId, session.uploadId), {
      recursive: true,
      force: true,
    });
  }
}

export const chunkedUploadService = new ChunkedUploadService(
  redisService,
  storageManager
);
