import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/order/:orderId', chatController.getMessages.bind(chatController));
router.post('/order/:orderId', chatController.sendMessage.bind(chatController));
router.get('/threads', chatController.getActiveThreads.bind(chatController));

export default router;
