import { Router } from 'express';
import { customerCrmController } from '../controllers/customer-crm.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', customerCrmController.getCustomers.bind(customerCrmController));
router.post('/:id/issue-credit', customerCrmController.issueCourtesyCredit.bind(customerCrmController));

export default router;
