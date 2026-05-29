import { Router } from 'express';
import { PrismaService } from '../config/prisma.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';
import { createUserSchema, updateUserSchema } from '../types/user.type.js';
import { email } from 'zod';
import EmailService from '../services/email.service.js';

const router = Router();
const prismaService = PrismaService.getInstance();
const userRepository = new UserRepository(prismaService.client);
const groupRepository = new GroupRepository(prismaService.client);
const emailService = new EmailService();
const userService = new UserService(userRepository, groupRepository, emailService);
const userController = new UserController(userService);

router.get(
  '/',
  authenticate,
  authorize(PermissionConstant.USER_READ.key),
  userController.list
);

router.get(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_READ.key),
  userController.getById
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.USER_CREATE.key),
  validateRequest(createUserSchema),
  userController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_UPDATE.key),
  validateRequest(updateUserSchema),
  userController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_DELETE.key),
  userController.delete
);

export default router;
