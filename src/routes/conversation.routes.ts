import { Router } from 'express';
import { PrismaService } from '../config/prisma.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { ConversationService } from '../services/conversation.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { createConversationSchema, updateConversationSchema } from '../types/conversation.type.js';

const router = Router();
const prismaService = PrismaService.getInstance();
const conversationRepository = new ConversationRepository(prismaService.client);
const userRepository = new UserRepository(prismaService.client);
const conversationService = new ConversationService(conversationRepository, userRepository);
const conversationController = new ConversationController(conversationService);

router.get(
  '/',
  authenticate,
  authorize(PermissionConstant.CONV_READ.key),
  conversationController.list
);

router.delete(
  '/',
  authenticate,
  conversationController.clearMine
);

router.get(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_READ.key),
  conversationController.getById
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.CONV_CREATE.key),
  validateRequest(createConversationSchema),
  conversationController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_UPDATE.key),
  validateRequest(updateConversationSchema),
  conversationController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.CONV_DELETE.key),
  conversationController.delete
);

export default router;
