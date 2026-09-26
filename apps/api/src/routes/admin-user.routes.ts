import { Router } from 'express';
import { adminUserController } from '../controllers/admin-user.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { UserRoleEnum } from '@prisma/client';
import {
  createAdminUserSchema,
  queryAdminUsersSchema,
  updateUserStatusSchema,
} from '../validators/admin-user.validator';

const router = Router();

// All admin user routes require authenticated ADMIN role
router.use(requireAuth);
router.use(requireRole([UserRoleEnum.ADMIN]));

router.post(
  '/',
  validateRequest({ body: createAdminUserSchema }),
  adminUserController.createUser.bind(adminUserController)
);

router.get(
  '/',
  validateRequest({ query: queryAdminUsersSchema }),
  adminUserController.listUsers.bind(adminUserController)
);

router.patch(
  '/:id/status',
  validateRequest({ body: updateUserStatusSchema }),
  adminUserController.updateUserStatus.bind(adminUserController)
);

router.delete(
  '/:id',
  adminUserController.deleteUser.bind(adminUserController)
);

export default router;
