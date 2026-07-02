import { z } from 'zod';

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

export const localFileUploadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(255).optional(),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'File exceeds 10MB').optional(),
  dataBase64: z.string().min(1),
});

export const uploadedFileDeleteSchema = z.object({
  url: z.string().trim().url(),
});

export type BulkDeleteAttachmentsRequestDto = z.infer<typeof bulkDeleteAttachmentsSchema>;
export type LocalFileUploadRequestDto = z.infer<typeof localFileUploadSchema>;
export type UploadedFileDeleteRequestDto = z.infer<typeof uploadedFileDeleteSchema>;

export interface BulkDeleteAttachmentsResponseDto {
  deletedCount: number;
  notFoundIds: string[];
}

export interface UploadedFileDeleteResponseDto {
  deleted: boolean;
}
