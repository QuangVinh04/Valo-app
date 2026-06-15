import { Router } from 'express';

import { messageController } from '../controllers/message.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { sendMessageSchema } from '../types/message.type.js';
import { aiChatRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();




router.post(
  '/conversations/:id',
  authenticate,
  aiChatRateLimit,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(sendMessageSchema),
  messageController.sendMessageStream
);

router.post(
  '/',
  authenticate,
  aiChatRateLimit,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(sendMessageSchema),
  messageController.sendMessageStream
);

export default router;
