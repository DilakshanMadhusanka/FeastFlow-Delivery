import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema } from '../validators/auth.validator';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

router.get('/me', userController.getProfile.bind(userController));
router.put('/profile', validateRequest({ body: updateProfileSchema }), userController.updateProfile.bind(userController));
router.post('/change-password', validateRequest({ body: changePasswordSchema }), userController.changePassword.bind(userController));

export default router;
