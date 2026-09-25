import { Router } from 'express';
import { financeController } from '../controllers/finance.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRoleEnum } from '@prisma/client';

const router = Router();

// Finance routes require authentication and manager roles (ADMIN or RESTAURANT_OWNER)
router.use(requireAuth);
router.use(requireRole([UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT_OWNER]));

router.get('/summary', financeController.getSummary.bind(financeController));
router.get('/ledger', financeController.getLedger.bind(financeController));
router.post('/payouts', financeController.processPayout.bind(financeController));

export default router;
