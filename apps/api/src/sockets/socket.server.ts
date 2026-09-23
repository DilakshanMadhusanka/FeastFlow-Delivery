import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env';
import { getRedisClient, isRedisConnected } from '../config/redis';
import { verifyAccessToken } from '../utils/token';
import { driverRepository } from '../repositories/driver.repository';
import { UserRoleEnum } from '@prisma/client';
import { SocketData } from './socket.types';
import { registerOrderHandlers } from './order.socket';
import { registerDriverHandlers } from './driver.socket';
import {
  OrderStatusChangedEvent,
  LiveLocationUpdate,
  OrderSummary,
  DeliveryJobRequestDto,
  NotificationDto,
} from '@food-delivery/shared';

let io: SocketIOServer<any, any, any, SocketData> | null = null;

export function initSocketServer(httpServer: http.Server): SocketIOServer<any, any, any, SocketData> {
  io = new SocketIOServer<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: [
        env.FRONTEND_WEB_URL,
        env.MOBILE_APP_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        '*', // Permissive in dev/test for mobile clients and tests
      ],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket', 'polling'],
  });

  // Redis Adapter Setup for horizontal scalability
  try {
    const pubClient = getRedisClient();
    if (isRedisConnected()) {
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter configured for horizontal scaling');
    } else {
      console.log('ℹ️ Redis not active; Socket.IO using high-performance in-memory adapter');
    }
  } catch (err) {
    console.warn('⚠️ Could not attach Redis adapter to Socket.IO; continuing with in-memory adapter');
  }

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
      };

      if (payload.roles.includes(UserRoleEnum.DELIVERY_DRIVER)) {
        const driver = await driverRepository.findDriverByUserId(payload.userId);
        if (driver) {
          socket.data.driverId = driver.id;
        }
      }

      next();
    } catch (err: any) {
      return next(new Error(`Authentication failed: ${err.message || 'Invalid token'}`));
    }
  });

  // Client Connection Lifecycle
  io.on('connection', (socket) => {
    const user = socket.data.user;
    // Auto-join personal user room for direct in-app notifications
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Auto-join admin channel for platform-wide order visibility
    if (user?.roles?.includes(UserRoleEnum.ADMIN)) {
      socket.join('admin:orders');
    }

    socket.on('join:user', (data: { userId: string }, callback?: (res: { success: boolean }) => void) => {
      if (data?.userId && (!user || user.userId === data.userId || user.roles.includes(UserRoleEnum.ADMIN))) {
        socket.join(`user:${data.userId}`);
        callback?.({ success: true });
      } else {
        callback?.({ success: false });
      }
    });

    socket.on('leave:user', (data: { userId: string }) => {
      if (data?.userId) {
        socket.leave(`user:${data.userId}`);
      }
    });

    registerOrderHandlers(io!, socket);
    registerDriverHandlers(io!, socket);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Real-time client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer<any, any, any, SocketData> | null {
  return io;
}

/**
 * Broadcasts an order status transition event to order tracking and merchant rooms.
 */
export function emitOrderStatusChanged(
  orderId: string,
  event: OrderStatusChangedEvent,
  restaurantId?: string,
  ownerId?: string
): void {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:status_changed', event);
  io.to('admin:orders').emit('order:status_changed', event);
  if (restaurantId) {
    io.to(`restaurant:${restaurantId}`).emit('order:status_changed', event);
  }
  if (ownerId) {
    io.to(`user:${ownerId}`).emit('order:status_changed', event);
  }
}

/**
 * Broadcasts courier GPS coordinates to active customer tracking screen.
 */
export function emitDriverLocation(orderId: string, location: LiveLocationUpdate): void {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:driver_location', location);
}

/**
 * Emits a newly placed order directly to the restaurant's live kitchen KDS screen.
 */
export function emitNewOrder(restaurantId: string, order: OrderSummary, ownerId?: string): void {
  if (!io) return;
  io.to(`restaurant:${restaurantId}`).emit('order:new', order);
  io.to('admin:orders').emit('order:new', order);
  if (ownerId) {
    io.to(`user:${ownerId}`).emit('order:new', order);
  }
}

/**
 * Broadcasts an available order to all online couriers in the fleet radar.
 */
export function emitJobAvailable(job: DeliveryJobRequestDto): void {
  if (!io) return;
  io.to('drivers:available').emit('driver:job_available', job);
}

/**
 * Emits a job dispatch event directly to the assigned courier.
 */
export function emitJobAssigned(driverId: string, payload: { orderId: string; assignmentId: string }): void {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('driver:job_assigned', payload);
}

/**
 * Emits a cancellation event directly to the assigned courier.
 */
export function emitJobCancelled(driverId: string, payload: { orderId: string; reason?: string }): void {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('driver:job_cancelled', payload);
}

/**
 * Emits a real-time notification to the user's connected socket sessions.
 */
export function emitNotification(userId: string, notification: NotificationDto): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}
