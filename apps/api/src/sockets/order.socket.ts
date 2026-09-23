import { Socket, Server } from 'socket.io';
import { prisma } from '../config/database';
import { UserRoleEnum } from '@prisma/client';
import { SocketData } from './socket.types';

export function registerOrderHandlers(
  _io: Server,
  socket: Socket<any, any, any, SocketData>
): void {
  // Join specific order room for real-time progress updates
  socket.on('join:order', async (data: { orderId: string }, callback?: (res: { success: boolean; message?: string }) => void) => {
    try {
      if (!data?.orderId) {
        callback?.({ success: false, message: 'Missing orderId' });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        include: {
          restaurant: { select: { ownerId: true } },
          deliveryAssignment: {
            include: {
              driver: { select: { userId: true } },
            },
          },
        },
      });

      if (!order) {
        callback?.({ success: false, message: 'Order not found' });
        return;
      }

      const user = socket.data.user;
      if (!user) {
        callback?.({ success: false, message: 'Authentication required' });
        return;
      }

      const isAdmin = user.roles.includes(UserRoleEnum.ADMIN);
      const isCustomer = order.customerId === user.userId;
      const isOwner = order.restaurant.ownerId === user.userId;
      const isDriver = order.deliveryAssignment?.driver?.userId === user.userId;

      if (!isAdmin && !isCustomer && !isOwner && !isDriver) {
        callback?.({ success: false, message: 'Forbidden: You do not have access to this order' });
        return;
      }

      const roomName = `order:${data.orderId}`;
      await socket.join(roomName);
      callback?.({ success: true, message: `Successfully joined ${roomName}` });
    } catch (err: any) {
      callback?.({ success: false, message: err.message || 'Internal server error joining order room' });
    }
  });

  // Leave order room
  socket.on('leave:order', async (data: { orderId: string }) => {
    if (data?.orderId) {
      await socket.leave(`order:${data.orderId}`);
    }
  });

  // Join merchant kitchen live queue room
  socket.on('join:restaurant', async (data: { restaurantId: string }, callback?: (res: { success: boolean; message?: string }) => void) => {
    try {
      if (!data?.restaurantId) {
        callback?.({ success: false, message: 'Missing restaurantId' });
        return;
      }

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
        select: { id: true, ownerId: true },
      });

      if (!restaurant) {
        callback?.({ success: false, message: 'Restaurant not found' });
        return;
      }

      const user = socket.data.user;
      if (!user) {
        callback?.({ success: false, message: 'Authentication required' });
        return;
      }

      const isAdmin = user.roles.includes(UserRoleEnum.ADMIN);
      const isOwner = restaurant.ownerId === user.userId;

      if (!isAdmin && !isOwner) {
        callback?.({ success: false, message: 'Forbidden: You do not own this restaurant' });
        return;
      }

      const roomName = `restaurant:${data.restaurantId}`;
      await socket.join(roomName);
      callback?.({ success: true, message: `Subscribed to live kitchen alerts on ${roomName}` });
    } catch (err: any) {
      callback?.({ success: false, message: err.message || 'Error subscribing to restaurant room' });
    }
  });

  // Leave restaurant room
  socket.on('leave:restaurant', async (data: { restaurantId: string }) => {
    if (data?.restaurantId) {
      await socket.leave(`restaurant:${data.restaurantId}`);
    }
  });
}
