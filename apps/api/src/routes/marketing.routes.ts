import { Router } from 'express';
import { marketingController } from '../controllers/marketing.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/campaigns', marketingController.getCampaigns.bind(marketingController));
router.post('/campaigns', marketingController.createCampaign.bind(marketingController));
router.patch('/campaigns/:id/toggle', marketingController.toggleCampaign.bind(marketingController));
router.delete('/campaigns/:id', marketingController.deleteCampaign.bind(marketingController));

export default router;
