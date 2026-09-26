import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import restaurantRoutes from './restaurant.routes';
import menuRoutes from './menu.routes';
import cartRoutes from './cart.routes';
import addressRoutes from './address.routes';
import paymentRoutes from './payment.routes';
import orderRoutes from './order.routes';
import driverRoutes from './driver.routes';
import { notificationRouter } from './notification.routes';
import couponRoutes from './coupon.routes';
import reviewRoutes from './review.routes';
import financeRoutes from './finance.routes';
import chatRoutes from './chat.routes';
import staffRoutes from './staff.routes';
import marketingRoutes from './marketing.routes';
import customerCrmRoutes from './customer-crm.routes';
import aiCopilotRoutes from './ai-copilot.routes';
import adminUserRoutes from './admin-user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/payments', paymentRoutes);
router.use('/orders', orderRoutes);
router.use('/drivers', driverRoutes);
router.use('/notifications', notificationRouter);
router.use('/coupons', couponRoutes);
router.use('/reviews', reviewRoutes);
router.use('/finance', financeRoutes);
router.use('/chat', chatRoutes);
router.use('/staff', staffRoutes);
router.use('/marketing', marketingRoutes);
router.use('/customers', customerCrmRoutes);
router.use('/ai', aiCopilotRoutes);

export default router;

