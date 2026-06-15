import { Router } from 'express';

import { groupController } from '../controllers/group.controller.js';
import { PermissionConstant } from '../constants/permission.constant.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { groupMembersSchema, groupSchema, updateGroupSchema } from '../types/group.type.js';

const router = Router();


router.get(
  '/',
  authenticate,
  authorize(PermissionConstant.GROUP_READ.key),
  groupController.getGroups
);

router.get(
  '/:id',
  authenticate,
  authorize(PermissionConstant.GROUP_READ.key),
  groupController.getGroupById
);

router.post(
  '/',
  authenticate,
  authorize(PermissionConstant.GROUP_CREATE.key),
  validateRequest(groupSchema),
  groupController.createGroup
);

router.put(
  '/:id',
  authenticate,
  authorize(PermissionConstant.GROUP_UPDATE.key),
  validateRequest(updateGroupSchema),
  groupController.updateGroup
);

router.delete(
  '/:id',
  authenticate,
  authorize(PermissionConstant.GROUP_DELETE.key),
  groupController.deleteGroup
);

router.get(
  '/:id/users',
  authenticate,
  authorize(PermissionConstant.GROUP_READ.key),
  groupController.getGroupMembers
);

router.post(
  '/:id/users',
  authenticate,
  authorize(PermissionConstant.GROUP_UPDATE.key),
  validateRequest(groupMembersSchema),
  groupController.addGroupMembers
);

router.delete(
  '/:id/users',
  authenticate,
  authorize(PermissionConstant.GROUP_UPDATE.key),
  validateRequest(groupMembersSchema),
  groupController.removeGroupMembers
);


export default router;
