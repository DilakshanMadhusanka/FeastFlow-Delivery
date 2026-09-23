import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { initSocketServer, emitOrderStatusChanged, emitDriverLocation, emitNewOrder, emitJobAvailable } from '../src/sockets';
import { generateAccessToken } from '../src/utils/token';
import { UserRoleEnum, OrderStatusEnum } from '@prisma/client';
import { prisma } from '../src/config/database';
import { driverRepository } from '../src/repositories/driver.repository';
import { OrderStatus } from '@food-delivery/shared';

describe('Real-Time Tracking & Socket.IO Engine', () => {
  let server: http.Server;
  let serverPort: number;
  let serverUrl: string;

  const testUser = {
    userId: 'cust-socket-1',
    email: 'customer@feastflow.com',
    roles: [UserRoleEnum.CUSTOMER],
  };

  const testDriverUser = {
    userId: 'driver-socket-1',
    email: 'courier@feastflow.com',
    roles: [UserRoleEnum.DELIVERY_DRIVER],
  };

  const testOwnerUser = {
    userId: 'owner-socket-1',
    email: 'owner@feastflow.com',
    roles: [UserRoleEnum.RESTAURANT_OWNER],
  };

  let customerToken: string;
  let driverToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    customerToken = generateAccessToken(testUser);
    driverToken = generateAccessToken(testDriverUser);
    ownerToken = generateAccessToken(testOwnerUser);

    server = http.createServer();
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
          serverUrl = `http://localhost:${serverPort}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should reject connection when no authentication token is provided', async () => {
    const socket = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: false,
    });

    const errorPromise = new Promise<string>((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
      });
    });

    socket.connect();
    const errorMsg = await errorPromise;
    expect(errorMsg).toContain('Authentication token required');
    socket.close();
  });

  it('should successfully authenticate and connect with a valid JWT token', async () => {
    const socket: ClientSocket = ioClient(serverUrl, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        resolve();
      });
    });

    socket.close();
  });

  it('should allow customer to join authorized order room and receive status updates', async () => {
    // Mock prisma.order.findUnique
    const findUniqueSpy = vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
      id: 'order-123',
      customerId: testUser.userId,
      restaurant: { ownerId: 'other-owner' },
      deliveryAssignment: null,
    } as any);

    const clientSocket = ioClient(serverUrl, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });

    // Join order room
    const joinResult = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      clientSocket.emit('join:order', { orderId: 'order-123' }, (res: any) => {
        resolve(res);
      });
    });

    expect(joinResult.success).toBe(true);
    expect(joinResult.message).toContain('order:order-123');

    // Listen for order:status_changed
    const statusPromise = new Promise<any>((resolve) => {
      clientSocket.on('order:status_changed', (data) => {
        resolve(data);
      });
    });

    // Trigger emission from server
    emitOrderStatusChanged('order-123', {
      orderId: 'order-123',
      orderNumber: 'FF-9999',
      previousStatus: OrderStatus.PENDING,
      newStatus: OrderStatus.RESTAURANT_ACCEPTED,
      updatedAt: new Date().toISOString(),
      notes: 'Kitchen confirmed preparation',
    });

    const statusEvent = await statusPromise;
    expect(statusEvent.orderId).toBe('order-123');
    expect(statusEvent.newStatus).toBe(OrderStatus.RESTAURANT_ACCEPTED);

    clientSocket.close();
    findUniqueSpy.mockRestore();
  });

  it('should broadcast live courier GPS coordinates to the order tracking room', async () => {
    const clientSocket = ioClient(serverUrl, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
      id: 'order-456',
      customerId: testUser.userId,
      restaurant: { ownerId: 'owner-xyz' },
      deliveryAssignment: null,
    } as any);

    await new Promise<void>((resolve) => clientSocket.on('connect', () => resolve()));

    await new Promise<void>((resolve) => {
      clientSocket.emit('join:order', { orderId: 'order-456' }, () => resolve());
    });

    const locationPromise = new Promise<any>((resolve) => {
      clientSocket.on('order:driver_location', (data) => resolve(data));
    });

    // Server emits courier coordinates
    emitDriverLocation('order-456', {
      orderId: 'order-456',
      driverId: 'driver-1',
      latitude: 40.758,
      longitude: -73.9855,
      bearing: 90,
      speed: 30,
      updatedAt: new Date().toISOString(),
    });

    const locationEvent = await locationPromise;
    expect(locationEvent.orderId).toBe('order-456');
    expect(locationEvent.latitude).toBe(40.758);
    expect(locationEvent.longitude).toBe(-73.9855);
    expect(locationEvent.bearing).toBe(90);

    clientSocket.close();
    vi.restoreAllMocks();
  });

  it('should allow restaurant owner to subscribe to live kitchen incoming orders room', async () => {
    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValueOnce({
      id: 'rest-123',
      ownerId: testOwnerUser.userId,
    } as any);

    const ownerSocket = ioClient(serverUrl, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => ownerSocket.on('connect', () => resolve()));

    const joinResult = await new Promise<any>((resolve) => {
      ownerSocket.emit('join:restaurant', { restaurantId: 'rest-123' }, (res: any) => resolve(res));
    });

    expect(joinResult.success).toBe(true);

    // Listen for order:new
    const newOrderPromise = new Promise<any>((resolve) => {
      ownerSocket.on('order:new', (data) => resolve(data));
    });

    emitNewOrder('rest-123', {
      id: 'ord-new-1',
      orderNumber: 'FF-8888',
      customerId: 'cust-1',
      restaurantId: 'rest-123',
      deliveryAddressId: 'addr-1',
      status: OrderStatus.PENDING,
      subtotal: 35.0,
      deliveryFee: 3.99,
      serviceFee: 1.5,
      discountAmount: 0,
      tipAmount: 5.0,
      totalAmount: 45.49,
      placedAt: new Date().toISOString(),
    });

    const receivedOrder = await newOrderPromise;
    expect(receivedOrder.orderNumber).toBe('FF-8888');
    expect(receivedOrder.totalAmount).toBe(45.49);

    ownerSocket.close();
    vi.restoreAllMocks();
  });

  it('should allow driver to join fleet dispatch and receive live jobs from radar', async () => {
    vi.spyOn(driverRepository, 'findDriverByUserId').mockResolvedValue({
      id: 'drv-profile-1',
      userId: testDriverUser.userId,
      isOnline: true,
    } as any);

    const driverSocket = ioClient(serverUrl, {
      auth: { token: driverToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => driverSocket.on('connect', () => resolve()));

    const joinResult = await new Promise<any>((resolve) => {
      driverSocket.emit('join:driver', {}, (res: any) => resolve(res));
    });

    expect(joinResult.success).toBe(true);

    const jobPromise = new Promise<any>((resolve) => {
      driverSocket.on('driver:job_available', (job) => resolve(job));
    });

    emitJobAvailable({
      orderId: 'job-order-1',
      orderNumber: 'FF-7777',
      restaurant: {
        id: 'r-1',
        name: 'Burger Palace',
        street: '123 Main St',
        city: 'Metropolis',
        latitude: 40.71,
        longitude: -74.0,
        phone: '555-1234',
      },
      deliveryAddress: {
        street: '456 Oak St',
        city: 'Metropolis',
        latitude: 40.73,
        longitude: -74.01,
      },
      itemsCount: 2,
      estimatedEarnings: 7.25,
      customerTip: 3.0,
      distanceToRestaurantKm: 1.2,
      distanceToCustomerKm: 2.5,
      placedAt: new Date().toISOString(),
    });

    const job = await jobPromise;
    expect(job.orderNumber).toBe('FF-7777');
    expect(job.estimatedEarnings).toBe(7.25);

    driverSocket.close();
    vi.restoreAllMocks();
  });
});
