import { Router } from 'express';
import { PrismaService } from '../config/prisma.js';
import MessageController from '../controllers/message.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import MessageRepository from '../repositories/message.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import AiService from '../services/ai.service.js';
import MessageService from '../services/message.service.js';
import { sendMessageSchema } from '../types/message.type.js';

const router = Router();
const prismaService = PrismaService.getInstance();
const conversationRepository = new ConversationRepository(prismaService.client);
const userRepository = new UserRepository(prismaService.client);
const messageRepository = new MessageRepository(prismaService.client);
const messageService = new MessageService(conversationRepository, userRepository, messageRepository);
const aiService = new AiService();
const messageController = new MessageController(messageService, aiService);

router.post(
  '/conversations/:id/stream',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(sendMessageSchema),
  messageController.sendMessageStream
);

router.post(
  '/conversations/:id',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(sendMessageSchema),
  messageController.sendMessage
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.CHAT.key),
  validateRequest(sendMessageSchema),
  messageController.sendMessageAuto
);

export default router;
