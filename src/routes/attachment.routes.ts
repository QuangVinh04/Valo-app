import { Router } from 'express';
import { attachmentController } from '../controllers/attachment.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadChunkFile } from '../middlewares/upload.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import {
  bulkDeleteAttachmentsSchema,
  initializeChunkUploadSchema,
  uploadedFileDeleteSchema,
} from '../types/upload.type.js';

const router = Router();

router.get(
  '/files/:fileName',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  attachmentController.downloadLocalAttachment
);

router.post(
  '/uploads/init',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(initializeChunkUploadSchema),
  attachmentController.initializeUpload
);

router.put(
  '/uploads/:uploadId/chunks/:chunkIndex',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  uploadChunkFile,
  attachmentController.uploadChunk
);

router.get(
  '/uploads/:uploadId',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  attachmentController.getUploadStatus
);

router.post(
  '/uploads/:uploadId/complete',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  attachmentController.completeUpload
);

router.delete(
  '/uploads/:uploadId',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  attachmentController.cancelUpload
);

router.delete(
  '/upload',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(uploadedFileDeleteSchema),
  attachmentController.deleteUploadedAttachment
);

router.get(
  '/',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  attachmentController.getMyAttachments
);

router.delete(
  '/',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(bulkDeleteAttachmentsSchema),
  attachmentController.deleteMyAttachments
);

export default router;
