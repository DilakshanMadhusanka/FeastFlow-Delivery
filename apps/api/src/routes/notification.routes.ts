import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All notification operations require authentication
router.use(requireAuth);

router.get('/', (req, res, next) => notificationController.getUserNotifications(req, res, next));
router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.delete('/:id', (req, res, next) => notificationController.deleteNotification(req, res, next));
router.post('/tokens', (req, res, next) => notificationController.registerDeviceToken(req, res, next));
router.delete('/tokens/:token', (req, res, next) => notificationController.unregisterDeviceToken(req, res, next));

export const notificationRouter = router;
