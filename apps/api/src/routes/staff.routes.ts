import { Router } from 'express';
import { staffController } from '../controllers/staff.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// PIN verification can be called from station terminals without full auth token
router.post('/verify-pin', staffController.verifyPin.bind(staffController));

router.use(requireAuth);

router.get('/', staffController.getStaff.bind(staffController));
router.post('/', staffController.addStaff.bind(staffController));
router.patch('/:id/toggle-shift', staffController.toggleShift.bind(staffController));
router.delete('/:id', staffController.removeStaff.bind(staffController));

export default router;
