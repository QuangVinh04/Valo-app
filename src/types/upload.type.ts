import { z } from 'zod';
import { UPLOAD_CONFIG } from '../constants/upload.constant.js';

export interface FileUploadDto {
  data: string;
  name: string;
  type: 'url';
  mime?: string;
  size?: number;
}

export interface AttachmentResponseDto {
  id: string;
  messageId?: string | null;
  name: string;
  mime: string;
  url?: string | null;
  size?: number | null;
  createdAt: Date;
}

export const bulkDeleteAttachmentsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const initializeChunkUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(UPLOAD_CONFIG.MAX_FILE_SIZE),
  chunkSize: z.number().int().positive().max(UPLOAD_CONFIG.MAX_CHUNK_SIZE),
  totalChunks: z.number().int().positive().max(Math.ceil(UPLOAD_CONFIG.MAX_FILE_SIZE / 1)),
});

export const uploadedFileDeleteSchema = z.object({
  url: z.string().trim().url(),
});

export type BulkDeleteAttachmentsRequestDto = z.infer<typeof bulkDeleteAttachmentsSchema>;
export type InitializeChunkUploadRequestDto = z.infer<typeof initializeChunkUploadSchema>;
export type UploadedFileDeleteRequestDto = z.infer<typeof uploadedFileDeleteSchema>;

export interface ChunkUploadSessionDto {
  uploadId: string;
  chunkSize: number;
  uploadedChunks: number[];
  expiresAt: string;
}

export interface ChunkUploadStatusDto {
  uploadId: string;
  status:
    | 'INITIALIZED'
    | 'UPLOADING'
    | 'ASSEMBLING'
    | 'STORING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';
  totalChunks: number;
  uploadedChunks: number[];
  missingChunks: number[];
}

export interface BulkDeleteAttachmentsResponseDto {
  deletedCount: number;
  notFoundIds: string[];
}

export interface UploadedFileDeleteResponseDto {
  deleted: boolean;
}
