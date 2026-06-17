import { Router } from 'express';
import multer from 'multer';

import { messageController } from '../controllers/message.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { sendMessageSchema } from '../types/message.type.js';
import { aiChatRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
});




router.post(
  '/conversations/:id',
  authenticate,
  aiChatRateLimit,
  authorize(PermissionConstant.CHAT.key),
  upload.array('files', 5),
  validateRequest(sendMessageSchema),
  messageController.sendMessageStream
);

router.post(
  '/',
  authenticate,
  aiChatRateLimit,
  authorize(PermissionConstant.CHAT.key),
  upload.array('files', 5),
  validateRequest(sendMessageSchema),
  messageController.sendMessageStream
);

export default router;
