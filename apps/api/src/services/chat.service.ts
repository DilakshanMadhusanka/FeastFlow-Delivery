import { prisma } from '../config/database';
import { emitOrderStatusChanged } from '../sockets';
import { NotFoundError } from '../utils/errors';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: 'STORE' | 'COURIER' | 'CUSTOMER';
  text: string;
  timestamp: string;
}

// In-memory persistent chat store indexed by orderId
const chatStore = new Map<string, ChatMessage[]>();

export class ChatService {
  async getMessagesByOrder(orderId: string): Promise<ChatMessage[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundError('Order not found');

    return chatStore.get(orderId) || [];
  }

  async sendMessage(
    orderId: string,
    sender: { id: string; name: string; role: 'STORE' | 'COURIER' | 'CUSTOMER' },
    text: string
  ): Promise<ChatMessage> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { select: { id: true, name: true, ownerId: true } },
        deliveryAssignment: { select: { driverId: true } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      orderId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text,
      timestamp: new Date().toISOString(),
    };

    const existing = chatStore.get(orderId) || [];
    existing.push(message);
    chatStore.set(orderId, existing);

    return message;
  }

  async getActiveThreads(restaurantId?: string) {
    const orders = await prisma.order.findMany({
      where: {
        ...(restaurantId && restaurantId !== 'all' ? { restaurantId } : {}),
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'REJECTED'] as any,
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        restaurant: { select: { name: true, city: true } },
        deliveryAssignment: {
          include: {
            driver: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
      },
      orderBy: { placedAt: 'desc' },
      take: 25,
    });

    return orders.map((o) => {
      const messages = chatStore.get(o.id) || [];
      const lastMessage = messages[messages.length - 1] || null;

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        restaurantName: o.restaurant.name,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        courierName: o.deliveryAssignment?.driver?.user?.name || null,
        courierPhone: o.deliveryAssignment?.driver?.user?.phone || null,
        messageCount: messages.length,
        lastMessage: lastMessage ? lastMessage.text : 'Order placed, channel opened.',
        lastMessageTime: lastMessage ? lastMessage.timestamp : o.placedAt.toISOString(),
      };
    });
  }
}

export const chatService = new ChatService();
