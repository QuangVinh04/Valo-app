import { Router } from 'express';

import { userController } from '../controllers/user.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize, authorizeSelfOrPermission } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { assignUserGroupsSchema, bulkDeleteUsersSchema, createUserSchema, updateUserSchema, updateUserSettingsSchema } from '../types/user.type.js';


const router = Router();

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

router.post(
  '/:id/resend-invitation',
  authenticate,
  authorize(PermissionConstant.USER_CREATE.key),
  userController.resendInvitation
);


router.put(
  '/:id',
  authenticate,
  authorizeSelfOrPermission('id', PermissionConstant.USER_UPDATE.key),
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
  '/bulk',
  authenticate,
  authorize(PermissionConstant.USER_DELETE.key),
  validateRequest(bulkDeleteUsersSchema),
  userController.deleteUsers
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.USER_DELETE.key),
  userController.deleteUser
);

export default router;
