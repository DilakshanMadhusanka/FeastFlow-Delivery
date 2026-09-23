import { Socket, Server } from 'socket.io';
import { prisma } from '../config/database';
import { UserRoleEnum } from '@prisma/client';
import { SocketData } from './socket.types';
import { driverRepository } from '../repositories/driver.repository';
import { LiveLocationUpdate, SocketDriverLocationPayload } from '@food-delivery/shared';

export function registerDriverHandlers(
  io: Server,
  socket: Socket<any, any, any, SocketData>
): void {
  // Join courier personal dispatch and fleet broadcast rooms
  socket.on('join:driver', async (_data: { driverId?: string }, callback?: (res: { success: boolean; message?: string }) => void) => {
    try {
      const user = socket.data.user;
      if (!user) {
        callback?.({ success: false, message: 'Authentication required' });
        return;
      }

      if (!user.roles.includes(UserRoleEnum.DELIVERY_DRIVER) && !user.roles.includes(UserRoleEnum.ADMIN)) {
        callback?.({ success: false, message: 'Forbidden: Delivery courier role required' });
        return;
      }

      const driver = await driverRepository.findDriverByUserId(user.userId);
      if (!driver) {
        callback?.({ success: false, message: 'Driver profile not registered' });
        return;
      }

      socket.data.driverId = driver.id;

      // Join direct dispatch channel for individual job assignments
      await socket.join(`driver:${driver.id}`);

      // If courier is online, join fleet radar channel
      if (driver.isOnline) {
        await socket.join('drivers:available');
      }

      callback?.({ success: true, message: `Subscribed driver to direct and available radar channels` });
    } catch (err: any) {
      callback?.({ success: false, message: err.message || 'Error subscribing driver channels' });
    }
  });

  // Leave driver rooms
  socket.on('leave:driver', async () => {
    const driverId = socket.data.driverId;
    if (driverId) {
      await socket.leave(`driver:${driverId}`);
    }
    await socket.leave('drivers:available');
  });

  // Real-time driver GPS telemetry emit
  socket.on('driver:update_location', async (data: SocketDriverLocationPayload, callback?: (res: { success: boolean; message?: string }) => void) => {
    try {
      if (typeof data?.latitude !== 'number' || typeof data?.longitude !== 'number') {
        callback?.({ success: false, message: 'Invalid GPS coordinates' });
        return;
      }

      const user = socket.data.user;
      if (!user) {
        callback?.({ success: false, message: 'Authentication required' });
        return;
      }

      let driverId = socket.data.driverId;
      if (!driverId) {
        const driver = await driverRepository.findDriverByUserId(user.userId);
        if (!driver) {
          callback?.({ success: false, message: 'Driver profile not found' });
          return;
        }
        driverId = driver.id;
        socket.data.driverId = driver.id;
      }

      // Record telemetry in database & update current coordinates
      await driverRepository.recordLocation(
        driverId,
        data.latitude,
        data.longitude,
        data.bearing,
        data.speed
      );

      // Find active delivery assignment if orderId not explicitly provided
      let orderId = data.orderId;
      if (!orderId) {
        const activeAssignment = await driverRepository.findActiveAssignment(driverId);
        if (activeAssignment) {
          orderId = activeAssignment.orderId;
        }
      }

      // Broadcast live location telemetry to customer & restaurant in order room
      if (orderId) {
        const telemetryPayload: LiveLocationUpdate = {
          orderId,
          driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          bearing: data.bearing,
          speed: data.speed,
          updatedAt: new Date().toISOString(),
        };

        io.to(`order:${orderId}`).emit('order:driver_location', telemetryPayload);
      }

      callback?.({ success: true });
    } catch (err: any) {
      console.error('Failed to process driver GPS telemetry:', err);
      callback?.({ success: false, message: err.message || 'Error processing telemetry' });
    }
  });
}
