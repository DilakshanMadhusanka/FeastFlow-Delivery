import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  authController.register.bind(authController)
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  validateRequest({ body: refreshTokenSchema }),
  authController.refreshToken.bind(authController)
);

router.post(
  '/logout',
  authController.logout.bind(authController)
);

router.post(
  '/forgot-password',
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword.bind(authController)
);

router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword.bind(authController)
);

export default router;
