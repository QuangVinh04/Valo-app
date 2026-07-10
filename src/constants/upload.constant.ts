export const UPLOAD_CONFIG = {
  MAX_FILES_PER_MESSAGE: 5,
  MAX_FILE_SIZE: 20 * 1024 * 1024,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024,
  CHUNK_SIZE: 2 * 1024 * 1024,
  MAX_CHUNK_SIZE: 5 * 1024 * 1024,
  MAX_CONCURRENT_UPLOADS_PER_USER: 5,
  CLOUDINARY_RETRIES: 2,
  SESSION_TTL_SECONDS: 6 * 60 * 60,
  COMPLETE_LOCK_TTL_SECONDS: 60,
} as const;

export const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.txt', '.xls', '.xlsx']);

export const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
