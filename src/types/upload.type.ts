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

export type BulkDeleteAttachmentsRequestDto = z.infer<typeof bulkDeleteAttachmentsSchema>;

export interface BulkDeleteAttachmentsResponseDto {
  deletedCount: number;
  notFoundIds: string[];
}
