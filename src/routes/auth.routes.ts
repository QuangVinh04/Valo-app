import { Router } from 'express';

import { PrismaService } from '../config/prisma.js';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { changePasswordSchema, loginSchema, registerSchema } from '../types/auth.type.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { authRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();
const prismaService = PrismaService.getInstance();
const userRepository = new UserRepository(prismaService.client);
const groupRepository = new GroupRepository(prismaService.client);
const authService = new AuthService(userRepository, groupRepository);
const authController = new AuthController(authService);

router.use(authRateLimit);

router.post('/register', validateRequest(registerSchema), authController.registerUser);
router.post('/login', validateRequest(loginSchema), authController.loginUser);
router.post('/logout', authenticate, authController.logoutUser);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword);

export default router;
