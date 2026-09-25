import { Router } from 'express';
import { aiCopilotController } from '../controllers/ai-copilot.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/generate-menu-copy', aiCopilotController.generateMenuCopy.bind(aiCopilotController));
router.post('/generate-review-reply', aiCopilotController.generateReviewReply.bind(aiCopilotController));
router.get('/demand-forecast', aiCopilotController.getDemandForecast.bind(aiCopilotController));

export default router;
