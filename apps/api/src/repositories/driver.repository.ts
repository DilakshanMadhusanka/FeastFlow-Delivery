import { prisma } from '../config/database';
import {
  AssignmentStatusEnum,
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  Prisma,
  VehicleTypeEnum,
} from '@prisma/client';
import { DeliveryWorkflowStep } from '@food-delivery/shared';
import { calculateDistanceKm } from '../utils/geo';

export class DriverRepository {
  /**
   * Finds driver profile by the associated user ID.
   */
  async findDriverByUserId(userId: string) {
    return prisma.deliveryDriver.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Finds driver by driver ID.
   */
  async findById(driverId: string) {
    return prisma.deliveryDriver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Creates or registers a driver profile for an authenticated user.
   */
  async createDriver(
    userId: string,
    data: {
      vehicleType?: VehicleTypeEnum;
      licensePlate?: string;
    }
  ) {
    return prisma.deliveryDriver.create({
      data: {
        userId,
        vehicleType: data.vehicleType || VehicleTypeEnum.MOTORCYCLE,
        licensePlate: data.licensePlate || null,
        isVerified: true, // Default to true in development/seeder
        isOnline: false,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Updates driver online status and GPS position.
   */
  async updateStatus(
    driverId: string,
    isOnline: boolean,
    latitude?: number,
    longitude?: number
  ) {
    return prisma.deliveryDriver.update({
      where: { id: driverId },
      data: {
        isOnline,
        ...(latitude !== undefined ? { currentLatitude: latitude } : {}),
        ...(longitude !== undefined ? { currentLongitude: longitude } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Records a GPS telemetry location update.
   */
  async recordLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    bearing?: number,
    speed?: number
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Update driver's current position
      await tx.deliveryDriver.update({
        where: { id: driverId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
        },
      });

      // 2. Insert telemetry breadcrumb
      return tx.driverLocation.create({
        data: {
          driverId,
          latitude,
          longitude,
          bearing: bearing || null,
          speed: speed || null,
        },
      });
    });
  }

  /**
   * Queries orders currently awaiting courier pickup.
   */
  async findAvailableOrders(driverLat?: number, driverLng?: number, maxDistanceKm: number = 35) {
    // Orders confirmed by restaurant, preparing, or ready for courier pickup without active driver
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatusEnum.RESTAURANT_ACCEPTED,
            OrderStatusEnum.PREPARING,
            OrderStatusEnum.READY_FOR_PICKUP,
          ],
        },
        OR: [
          { deliveryAssignment: null },
          {
            deliveryAssignment: {
              status: {
                in: [AssignmentStatusEnum.REJECTED, AssignmentStatusEnum.CANCELLED],
              },
            },
          },
        ],
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            latitude: true,
            longitude: true,
            phone: true,
          },
        },
        deliveryAddress: {
          select: {
            street: true,
            apartment: true,
            city: true,
            latitude: true,
            longitude: true,
            deliveryInstructions: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            nameSnapshot: true,
          },
        },
      },
      orderBy: { placedAt: 'desc' },
      take: 20,
    });

    // Compute distances and map into job requests
    const defaultDriverCoords = {
      latitude: driverLat || 40.7128,
      longitude: driverLng || -74.006,
    };

    return orders
      .map((order) => {
        const restCoords = {
          latitude: order.restaurant.latitude,
          longitude: order.restaurant.longitude,
        };
        const custCoords = {
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
        };

        const distToRest = calculateDistanceKm(defaultDriverCoords, restCoords);
        const distToCust = calculateDistanceKm(restCoords, custCoords);

        // Standard driver payout: $4 base + $1.20 per delivery km + tip
        const basePayout = 4.0;
        const distancePayout = Math.round(distToCust * 1.2 * 100) / 100;
        const tip = Number(order.tipAmount || 0);
        const estimatedEarnings = Math.round((basePayout + distancePayout + tip) * 100) / 100;

        const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurant: {
            id: order.restaurant.id,
            name: order.restaurant.name,
            street: order.restaurant.street,
            city: order.restaurant.city,
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude,
            phone: order.restaurant.phone,
          },
          deliveryAddress: {
            street: order.deliveryAddress.street,
            apartment: order.deliveryAddress.apartment,
            city: order.deliveryAddress.city,
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude,
            deliveryInstructions: order.deliveryAddress.deliveryInstructions,
          },
          itemsCount,
          estimatedEarnings,
          customerTip: tip,
          distanceToRestaurantKm: distToRest,
          distanceToCustomerKm: distToCust,
          placedAt: order.placedAt.toISOString(),
        };
      })
      .filter((job) => job.distanceToRestaurantKm <= maxDistanceKm);
  }

  /**
   * Retrieves the currently active delivery assignment for a driver.
   */
  async findActiveAssignment(driverId: string) {
    return prisma.deliveryAssignment.findFirst({
      where: {
        driverId,
        status: {
          in: [
            AssignmentStatusEnum.ASSIGNED,
            AssignmentStatusEnum.ACCEPTED,
            AssignmentStatusEnum.PICKED_UP,
          ],
        },
      },
      include: {
        order: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
            deliveryAddress: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
            items: {
              include: {
                addons: true,
              },
            },
            payment: true,
          },
        },
      },
    });
  }

  /**
   * Atomically accepts a delivery job.
   */
  async acceptJob(driverId: string, orderId: string, payout: number = 5.0) {
    return prisma.$transaction(async (tx) => {
      // 1. Check if driver already has an in-flight delivery
      const active = await tx.deliveryAssignment.findFirst({
        where: {
          driverId,
          status: {
            in: [
              AssignmentStatusEnum.ASSIGNED,
              AssignmentStatusEnum.ACCEPTED,
              AssignmentStatusEnum.PICKED_UP,
            ],
          },
        },
      });

      if (active) {
        throw new Error('You already have an active in-flight delivery. Complete it first.');
      }

      // 2. Fetch order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { deliveryAssignment: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (
        order.deliveryAssignment &&
        order.deliveryAssignment.status !== AssignmentStatusEnum.REJECTED &&
        order.deliveryAssignment.status !== AssignmentStatusEnum.CANCELLED
      ) {
        throw new Error('Order has already been assigned to another courier');
      }

      // 3. Upsert assignment
      const assignment = await tx.deliveryAssignment.upsert({
        where: { orderId },
        create: {
          orderId,
          driverId,
          status: AssignmentStatusEnum.ACCEPTED,
          acceptedAt: new Date(),
          driverPayout: new Prisma.Decimal(payout.toFixed(2)),
          notes: 'HEADING_TO_RESTAURANT',
        },
        update: {
          driverId,
          status: AssignmentStatusEnum.ACCEPTED,
          acceptedAt: new Date(),
          driverPayout: new Prisma.Decimal(payout.toFixed(2)),
          notes: 'HEADING_TO_RESTAURANT',
        },
        include: {
          order: true,
        },
      });

      // 4. Update order status to DRIVER_ASSIGNED
      if (order.status !== OrderStatusEnum.DRIVER_ASSIGNED) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatusEnum.DRIVER_ASSIGNED },
        });
      }

      // 5. Fetch driver's user ID for status audit
      const driver = await tx.deliveryDriver.findUnique({
        where: { id: driverId },
        select: { userId: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatusEnum.DRIVER_ASSIGNED,
          notes: 'Courier accepted delivery assignment',
          changedById: driver?.userId || null,
        },
      });

      return assignment;
    });
  }

  /**
   * Advances the turn-by-turn delivery workflow.
   */
  async advanceWorkflowStep(
    driverId: string,
    assignmentId: string,
    step: DeliveryWorkflowStep,
    notes?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const assignment = await tx.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: { order: { include: { payment: true } } },
      });

      if (!assignment || assignment.driverId !== driverId) {
        throw new Error('Active delivery assignment not found');
      }

      const driver = await tx.deliveryDriver.findUnique({
        where: { id: driverId },
        select: { userId: true },
      });

      const orderId = assignment.orderId;

      if (step === 'ARRIVED_AT_RESTAURANT') {
        await tx.deliveryAssignment.update({
          where: { id: assignmentId },
          data: { notes: 'ARRIVED_AT_RESTAURANT' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: assignment.order.status,
            notes: notes || 'Courier arrived at restaurant to collect order',
            changedById: driver?.userId || null,
          },
        });
      } else if (step === 'PICKED_UP') {
        await tx.deliveryAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatusEnum.PICKED_UP,
            pickedUpAt: new Date(),
            notes: 'PICKED_UP',
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatusEnum.PICKED_UP },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatusEnum.PICKED_UP,
            notes: notes || 'Courier picked up order from restaurant',
            changedById: driver?.userId || null,
          },
        });
      } else if (step === 'HEADING_TO_CUSTOMER') {
        await tx.deliveryAssignment.update({
          where: { id: assignmentId },
          data: { notes: 'HEADING_TO_CUSTOMER' },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatusEnum.ON_THE_WAY },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatusEnum.ON_THE_WAY,
            notes: notes || 'Courier en route to customer destination',
            changedById: driver?.userId || null,
          },
        });
      } else if (step === 'ARRIVED_AT_CUSTOMER') {
        await tx.deliveryAssignment.update({
          where: { id: assignmentId },
          data: { notes: 'ARRIVED_AT_CUSTOMER' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatusEnum.ON_THE_WAY,
            notes: notes || 'Courier arrived at customer dropoff destination',
            changedById: driver?.userId || null,
          },
        });
      } else if (step === 'DELIVERED') {
        await tx.deliveryAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatusEnum.DELIVERED,
            deliveredAt: new Date(),
            notes: 'DELIVERED',
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatusEnum.DELIVERED,
            completedAt: new Date(),
          },
        });

        // If Cash on Delivery, mark payment completed
        if (
          assignment.order.payment &&
          assignment.order.payment.paymentMethod === PaymentMethodEnum.COD
        ) {
          await tx.payment.update({
            where: { id: assignment.order.payment.id },
            data: { paymentStatus: PaymentStatusEnum.COMPLETED },
          });
        }

        // Increment driver total deliveries
        await tx.deliveryDriver.update({
          where: { id: driverId },
          data: { totalDeliveries: { increment: 1 } },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatusEnum.DELIVERED,
            notes: notes || 'Courier successfully delivered order to customer',
            changedById: driver?.userId || null,
          },
        });
      }

      return tx.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          order: {
            include: {
              restaurant: true,
              deliveryAddress: true,
              customer: true,
              items: true,
              payment: true,
            },
          },
        },
      });
    });
  }

  /**
   * Aggregates driver earnings, tips, and delivery history.
   */
  async getEarnings(driverId: string) {
    const completedAssignments = await prisma.deliveryAssignment.findMany({
      where: {
        driverId,
        status: AssignmentStatusEnum.DELIVERED,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            tipAmount: true,
            placedAt: true,
            restaurant: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let todayEarnings = 0;
    let weekEarnings = 0;
    let totalEarnings = 0;
    let todayDeliveries = 0;

    const recentDeliveries = completedAssignments.map((a) => {
      const payout = Number(a.driverPayout);
      const tip = Number(a.order.tipAmount || 0);
      const total = Math.round((payout + tip) * 100) / 100;
      const deliveredTime = a.deliveredAt || a.createdAt;

      totalEarnings += total;

      if (deliveredTime >= startOfToday) {
        todayEarnings += total;
        todayDeliveries += 1;
      }
      if (deliveredTime >= startOfWeek) {
        weekEarnings += total;
      }

      return {
        id: a.id,
        orderNumber: a.order.orderNumber,
        restaurantName: a.order.restaurant.name,
        deliveredAt: deliveredTime.toISOString(),
        payout,
        tip,
        total,
      };
    });

    return {
      todayEarnings: Math.round(todayEarnings * 100) / 100,
      weekEarnings: Math.round(weekEarnings * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      todayDeliveries,
      totalDeliveries: completedAssignments.length,
      recentDeliveries: recentDeliveries.slice(0, 20),
    };
  }

  /**
   * Retrieves all drivers across the platform with live telemetry and current assignments.
   */
  async findAllDrivers() {
    return prisma.deliveryDriver.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignments: {
          where: {
            status: {
              in: [
                AssignmentStatusEnum.ASSIGNED,
                AssignmentStatusEnum.ACCEPTED,
                AssignmentStatusEnum.PICKED_UP,
              ],
            },
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                restaurant: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Manually dispatches an order to a courier by an admin or restaurant manager.
   */
  async dispatchAssignOrder(orderId: string, driverId: string, payout: number = 5.0) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { restaurant: true },
      });
      if (!order) throw new Error('Order not found');

      const driver = await tx.deliveryDriver.findUnique({
        where: { id: driverId },
        include: { user: true },
      });
      if (!driver) throw new Error('Driver not found');

      const assignment = await tx.deliveryAssignment.upsert({
        where: { orderId },
        create: {
          orderId,
          driverId,
          status: AssignmentStatusEnum.ASSIGNED,
          assignedAt: new Date(),
          driverPayout: new Prisma.Decimal(payout.toFixed(2)),
        },
        update: {
          driverId,
          status: AssignmentStatusEnum.ASSIGNED,
          assignedAt: new Date(),
          driverPayout: new Prisma.Decimal(payout.toFixed(2)),
        },
        include: { order: true, driver: { include: { user: true } } },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatusEnum.DRIVER_ASSIGNED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatusEnum.DRIVER_ASSIGNED,
          notes: `Courier ${driver.user.name} dispatched to restaurant`,
        },
      });

      return assignment;
    });
  }
}

export const driverRepository = new DriverRepository();
