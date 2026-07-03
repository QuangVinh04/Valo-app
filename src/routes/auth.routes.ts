import { Router } from 'express';

import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { changePasswordSchema, loginSchema, otpSchema, registerSchema, resendOtpSchema } from '../types/auth.type.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();
router.use(authRateLimit);

router.post('/register', validateRequest(registerSchema), authController.registerUser);
router.post('/login', validateRequest(loginSchema), authController.loginUser);
router.post('/verify-otp', validateRequest(otpSchema), authController.verifyOtp);
router.post('/resend-otp', validateRequest(resendOtpSchema), authController.resendOtp);
router.post('/logout', authenticate, authController.logoutUser);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword);
router.get('/permissions', authenticate, authController.getCurrentUserPermissions);

export default router;
