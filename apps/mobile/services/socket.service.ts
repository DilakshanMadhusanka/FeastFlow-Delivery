import { io, Socket } from 'socket.io-client';
import { getItem, StorageKeys } from './storage';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  OrderStatusChangedEvent,
  LiveLocationUpdate,
  DeliveryJobRequestDto,
  SocketDriverLocationPayload,
  NotificationDto,
} from '@food-delivery/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class MobileSocketService {
  private socket: TypedSocket | null = null;
  private currentOrderId: string | null = null;

  async connect(): Promise<TypedSocket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await getItem(StorageKeys.ACCESS_TOKEN);
    // Default URL: strip trailing /api/v1 to reach root socket server
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    this.socket.on('connect', () => {
      console.log('⚡ Mobile App Connected to Socket Server');
      if (this.currentOrderId) {
        this.joinOrder(this.currentOrderId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Mobile Socket Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Mobile Socket connection error:', err.message);
    });

    return this.socket;
  }

  joinOrder(orderId: string): void {
    this.currentOrderId = orderId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:order', { orderId }, (res) => {
        if (res?.success) {
          console.log(`📡 Joined real-time room for order: ${orderId}`);
        }
      });
    }
  }

  leaveOrder(orderId: string): void {
    if (this.socket) {
      this.socket.emit('leave:order', { orderId });
    }
    if (this.currentOrderId === orderId) {
      this.currentOrderId = null;
    }
  }

  onOrderStatusChanged(callback: (event: OrderStatusChangedEvent) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on('order:status_changed', callback);
    return () => {
      this.socket?.off('order:status_changed', callback);
    };
  }

  onNotification(callback: (notification: NotificationDto) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on('notification:new', callback);
    return () => {
      this.socket?.off('notification:new', callback);
    };
  }

  onDriverLocation(callback: (location: LiveLocationUpdate) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on('order:driver_location', callback);
    return () => {
      this.socket?.off('order:driver_location', callback);
    };
  }

  joinDriver(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:driver', {});
    }
  }

  leaveDriver(): void {
    if (this.socket) {
      this.socket.emit('leave:driver', {});
    }
  }

  onJobAvailable(callback: (job: DeliveryJobRequestDto) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on('driver:job_available', callback);
    return () => {
      this.socket?.off('driver:job_available', callback);
    };
  }

  emitDriverLocation(payload: SocketDriverLocationPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('driver:update_location', payload);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const mobileSocketService = new MobileSocketService();
