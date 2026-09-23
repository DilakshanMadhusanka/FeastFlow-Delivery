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

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/payments', paymentRoutes);
router.use('/orders', orderRoutes);
router.use('/drivers', driverRoutes);
router.use('/notifications', notificationRouter);

export default router;

