import { io, Socket } from 'socket.io-client';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  OrderSummary,
  OrderStatusChangedEvent,
} from '@food-delivery/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: TypedSocket | null = null;
  private currentRestaurantId: string | null = null;

  connect(): TypedSocket {
    const token = localStorage.getItem('feastflow_access_token');
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.auth = { token };
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    this.socket.on('connect', () => {
      console.log('⚡ Web KDS Connected to Real-time Socket Server');
      if (this.currentRestaurantId) {
        this.joinRestaurant(this.currentRestaurantId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Web KDS Socket Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Web KDS Socket connection error:', err.message);
    });

    return this.socket;
  }

  joinRestaurant(restaurantId: string): void {
    this.currentRestaurantId = restaurantId;
    if (!this.socket) {
      this.connect();
    }
    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join:restaurant', { restaurantId }, (res) => {
          if (res?.success) {
            console.log(`📡 Successfully subscribed to kitchen channel for restaurant: ${restaurantId}`);
          } else {
            console.warn(`⚠️ Failed to join restaurant room: ${res?.message}`);
          }
        });
      } else {
        this.socket.once('connect', () => {
          this.socket?.emit('join:restaurant', { restaurantId }, (res) => {
            if (res?.success) {
              console.log(`📡 Successfully subscribed to kitchen channel for restaurant: ${restaurantId}`);
            }
          });
        });
      }
    }
  }

  leaveRestaurant(restaurantId: string): void {
    if (this.socket) {
      this.socket.emit('leave:restaurant', { restaurantId });
    }
    if (this.currentRestaurantId === restaurantId) {
      this.currentRestaurantId = null;
    }
  }

  onNewOrder(callback: (order: OrderSummary) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('order:new', callback);
    return () => {
      this.socket?.off('order:new', callback);
    };
  }

  onOrderStatusChanged(callback: (event: OrderStatusChangedEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('order:status_changed', callback);
    return () => {
      this.socket?.off('order:status_changed', callback);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
