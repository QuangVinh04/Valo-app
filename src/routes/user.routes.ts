import { Router } from 'express';
import { PrismaService } from '../config/prisma.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';
import { assignUserGroupsSchema, createUserSchema, updateUserProfileSchema, updateUserSchema, updateUserSettingsSchema } from '../types/user.type.js';
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
  userController.getUsers
);

router.patch(
  '/settings',
  authenticate,
  validateRequest(updateUserSettingsSchema),
  userController.updateUserSettings
);

router.patch(
  '/profile',
  authenticate,
  validateRequest(updateUserProfileSchema),
  userController.updateUserProfile
);

router.get(
  '/me',
  authenticate,
  userController.getCurrentUser
);

router.delete(
  '/me',
  authenticate,
  userController.deleteCurrentUser
);

router.get(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_READ.key),
  userController.getUserById
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.USER_CREATE.key),
  validateRequest(createUserSchema),
  userController.createUser
);

router.put(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_UPDATE.key),
  validateRequest(updateUserSchema),
  userController.updateUser
);

router.post(
  '/:id/groups',
  authenticate,
  authorize(PermissionConstant.USER_UPDATE.key),
  validateRequest(assignUserGroupsSchema),
  userController.assignGroups
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_DELETE.key),
  userController.deleteUser
);

export default router;
