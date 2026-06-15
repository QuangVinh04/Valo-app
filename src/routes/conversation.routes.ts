import { Router } from 'express';

import { conversationController } from '../controllers/conversation.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { createConversationSchema, updateConversationSchema } from '../types/conversation.type.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(PermissionConstant.CONV_READ.key),
  conversationController.getConversations
);

router.delete(
  '/',
  authenticate,
  authorize(PermissionConstant.CONV_DELETE.key),
  conversationController.clearMyConversations
);

router.get(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_READ.key),
  conversationController.getConversationById
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.CONV_CREATE.key),
  validateRequest(createConversationSchema),
  conversationController.createConversation
);

router.put(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_UPDATE.key),
  validateRequest(updateConversationSchema),
  conversationController.updateConversation
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_DELETE.key),
  conversationController.deleteConversation
);

export default router;
