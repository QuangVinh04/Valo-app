import { Router } from 'express';
import { attachmentController } from '../controllers/attachment.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { bulkDeleteAttachmentsSchema, localFileUploadSchema, uploadedFileDeleteSchema } from '../types/upload.type.js';

const router = Router();

router.get(
  '/files/:fileName',
  attachmentController.downloadLocalAttachment
);

router.post(
  '/upload-local',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(localFileUploadSchema),
  attachmentController.uploadLocalAttachment
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
