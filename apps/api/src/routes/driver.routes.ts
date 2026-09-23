import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  toggleDriverStatusSchema,
  updateLocationSchema,
  driverStepSchema,
  registerDriverSchema,
} from '../validators/driver.validator';

const router = Router();

// All driver operations require user authentication
router.use(requireAuth);

router.get('/me', driverController.getProfile.bind(driverController));

router.post(
  '/register',
  validateRequest({ body: registerDriverSchema }),
  driverController.register.bind(driverController)
);

router.patch(
  '/status',
  validateRequest({ body: toggleDriverStatusSchema }),
  driverController.toggleStatus.bind(driverController)
);

router.post(
  '/location',
  validateRequest({ body: updateLocationSchema }),
  driverController.updateLocation.bind(driverController)
);

router.get('/requests', driverController.getJobRequests.bind(driverController));

router.post('/requests/:orderId/accept', driverController.acceptJob.bind(driverController));

router.get('/active', driverController.getActiveDelivery.bind(driverController));

router.post(
  '/active/step',
  validateRequest({ body: driverStepSchema }),
  driverController.advanceStep.bind(driverController)
);

router.get('/earnings', driverController.getEarnings.bind(driverController));

export default router;
