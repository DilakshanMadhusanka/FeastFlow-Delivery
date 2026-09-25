import { driverRepository } from '../repositories/driver.repository';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  ToggleDriverStatusInput,
  UpdateLocationInput,
  RegisterDriverInput,
} from '../validators/driver.validator';
import { DeliveryWorkflowStep, UserRole, OrderStatus } from '@food-delivery/shared';
import { AssignmentStatusEnum, OrderStatusEnum, PaymentMethodEnum, UserRoleEnum, VehicleTypeEnum } from '@prisma/client';
import {
  emitDriverLocation,
  emitOrderStatusChanged,
  emitJobAssigned,
} from '../sockets';

export class DriverService {
  /**
   * Retrieves driver profile, or auto-creates one if the user holds the courier role.
   */
  async getOrCreateDriverProfile(userId: string, roles: UserRoleEnum[]) {
    let driver = await driverRepository.findDriverByUserId(userId);

    if (!driver) {
      driver = await driverRepository.createDriver(userId, {
        vehicleType: VehicleTypeEnum.MOTORCYCLE,
      });
    }

    return {
      id: driver.id,
      userId: driver.userId,
      vehicleType: driver.vehicleType,
      licensePlate: driver.licensePlate,
      isOnline: driver.isOnline,
      isVerified: driver.isVerified,
      currentLatitude: driver.currentLatitude,
      currentLongitude: driver.currentLongitude,
      ratingAverage: Number(driver.ratingAverage),
      ratingCount: driver.ratingCount,
      totalDeliveries: driver.totalDeliveries,
      user: driver.user
        ? {
            id: driver.user.id,
            name: driver.user.name,
            email: driver.user.email,
            phone: driver.user.phone,
            avatarUrl: driver.user.avatarUrl,
          }
        : undefined,
    };
  }

  /**
   * Registers a new driver profile with vehicle details.
   */
  async registerDriver(userId: string, input: RegisterDriverInput) {
    const existing = await driverRepository.findDriverByUserId(userId);
    if (existing) {
      throw new BadRequestError('Driver profile already registered for this user');
    }

    return driverRepository.createDriver(userId, {
      vehicleType: input.vehicleType,
      licensePlate: input.licensePlate,
    });
  }

  /**
   * Toggles courier online / offline availability.
   */
  async toggleOnlineStatus(userId: string, input: ToggleDriverStatusInput) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found. Please register first.');
    }

    const updated = await driverRepository.updateStatus(
      driver.id,
      input.isOnline,
      input.latitude,
      input.longitude
    );

    return {
      id: updated.id,
      isOnline: updated.isOnline,
      currentLatitude: updated.currentLatitude,
      currentLongitude: updated.currentLongitude,
    };
  }

  /**
   * Updates driver telemetry (GPS location, bearing, speed).
   */
  async updateLocation(userId: string, input: UpdateLocationInput) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    await driverRepository.recordLocation(
      driver.id,
      input.latitude,
      input.longitude,
      input.bearing,
      input.speed
    );

    const active = await driverRepository.findActiveAssignment(driver.id);
    if (active) {
      emitDriverLocation(active.orderId, {
        orderId: active.orderId,
        driverId: driver.id,
        latitude: input.latitude,
        longitude: input.longitude,
        bearing: input.bearing,
        speed: input.speed,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      latitude: input.latitude,
      longitude: input.longitude,
      bearing: input.bearing,
      speed: input.speed,
      recordedAt: new Date().toISOString(),
    };
  }

  /**
   * Queries nearby job requests within driver's service radius.
   */
  async getJobRequests(userId: string, driverLat?: number, driverLng?: number) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    if (!driver.isOnline) {
      return [];
    }

    const lat = driverLat || driver.currentLatitude || 40.7128;
    const lng = driverLng || driver.currentLongitude || -74.006;

    return driverRepository.findAvailableOrders(lat, lng, 25);
  }

  /**
   * Accepts a job request from the radar.
   */
  async acceptJob(userId: string, orderId: string) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    if (!driver.isOnline) {
      throw new BadRequestError('You must go online to accept delivery requests');
    }

    const assignment = await driverRepository.acceptJob(driver.id, orderId);
    emitJobAssigned(driver.id, { orderId, assignmentId: assignment.id });
    emitOrderStatusChanged(
      orderId,
      {
        orderId,
        orderNumber: assignment.order.orderNumber,
        previousStatus: OrderStatus.READY_FOR_PICKUP,
        newStatus: OrderStatus.DRIVER_ASSIGNED,
        updatedAt: new Date().toISOString(),
        notes: 'Courier assigned and en route to restaurant',
      },
      assignment.order.restaurantId
    );
    return assignment;
  }

  /**
   * Retrieves current in-flight delivery assignment.
   */
  async getActiveDelivery(userId: string) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    const assignment = await driverRepository.findActiveAssignment(driver.id);
    if (!assignment) {
      return null;
    }

    const order = assignment.order;

    // Derive step based on order and assignment state
    let currentStep: DeliveryWorkflowStep = 'HEADING_TO_RESTAURANT';
    if (assignment.status === AssignmentStatusEnum.PICKED_UP) {
      currentStep =
        order.status === OrderStatusEnum.ON_THE_WAY
          ? 'HEADING_TO_CUSTOMER'
          : 'PICKED_UP';
    } else if (order.status === OrderStatusEnum.ON_THE_WAY) {
      currentStep = 'HEADING_TO_CUSTOMER';
    } else if (order.status === OrderStatusEnum.DELIVERED) {
      currentStep = 'DELIVERED';
    }

    return {
      assignmentId: assignment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      currentStep,
      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name,
        street: order.restaurant.street,
        city: order.restaurant.city,
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude,
        phone: order.restaurant.phone,
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      deliveryAddress: {
        street: order.deliveryAddress.street,
        apartment: order.deliveryAddress.apartment,
        city: order.deliveryAddress.city,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
      },
      items: order.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        name: i.nameSnapshot,
        addons: i.addons.map((a) => a.nameSnapshot),
        specialNotes: i.specialNotes,
      })),
      totalAmount: Number(order.totalAmount),
      driverPayout: Number(assignment.driverPayout),
      customerTip: Number(order.tipAmount || 0),
      paymentMethod: order.payment?.paymentMethod || PaymentMethodEnum.COD,
      acceptedAt: assignment.acceptedAt?.toISOString() || null,
      pickedUpAt: assignment.pickedUpAt?.toISOString() || null,
    };
  }

  /**
   * Advances the turn-by-turn workflow.
   */
  async advanceWorkflowStep(
    userId: string,
    step: DeliveryWorkflowStep,
    notes?: string
  ) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    const active = await driverRepository.findActiveAssignment(driver.id);
    if (!active) {
      throw new BadRequestError('No active in-flight delivery assignment found');
    }

    await driverRepository.advanceWorkflowStep(driver.id, active.id, step, notes);
    const updated = await this.getActiveDelivery(userId);

    if (updated) {
      emitOrderStatusChanged(
        active.orderId,
        {
          orderId: active.orderId,
          orderNumber: active.order.orderNumber,
          previousStatus: active.order.status as any,
          newStatus: updated.status as any,
          updatedAt: new Date().toISOString(),
          notes: `Courier workflow advanced to ${step}`,
        },
        active.order.restaurantId
      );
    }

    return updated;
  }

  /**
   * Retrieves earnings and completed delivery metrics.
   */
  async getEarnings(userId: string) {
    const driver = await driverRepository.findDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    return driverRepository.getEarnings(driver.id);
  }

  /**
   * Retrieves driver fleet for management overview.
   */
  async getFleet() {
    const drivers = await driverRepository.findAllDrivers();
    return drivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      vehicleType: d.vehicleType,
      licensePlate: d.licensePlate,
      isOnline: d.isOnline,
      isVerified: d.isVerified,
      currentLatitude: d.currentLatitude,
      currentLongitude: d.currentLongitude,
      ratingAverage: Number(d.ratingAverage),
      ratingCount: d.ratingCount,
      totalDeliveries: d.totalDeliveries,
      user: d.user
        ? {
            name: d.user.name,
            email: d.user.email,
            phone: d.user.phone,
            avatarUrl: d.user.avatarUrl,
          }
        : null,
      activeAssignment: d.assignments[0]
        ? {
            id: d.assignments[0].id,
            status: d.assignments[0].status,
            orderId: d.assignments[0].order.id,
            orderNumber: d.assignments[0].order.orderNumber,
            restaurantName: d.assignments[0].order.restaurant.name,
          }
        : null,
    }));
  }

  /**
   * Manually dispatches an order to a specific courier.
   */
  async dispatchAssignOrder(orderId: string, driverId: string, payout: number = 5.0) {
    const assignment = await driverRepository.dispatchAssignOrder(orderId, driverId, payout);

    emitJobAssigned(driverId, { orderId, assignmentId: assignment.id });
    emitOrderStatusChanged(
      orderId,
      {
        orderId,
        orderNumber: assignment.order.orderNumber,
        previousStatus: OrderStatus.READY_FOR_PICKUP,
        newStatus: OrderStatus.DRIVER_ASSIGNED,
        updatedAt: new Date().toISOString(),
        notes: `Courier ${assignment.driver.user.name} assigned manually by manager`,
      },
      assignment.order.restaurantId
    );

    return {
      assignmentId: assignment.id,
      orderId: assignment.orderId,
      status: assignment.status,
      driverName: assignment.driver.user.name,
    };
  }
}

export const driverService = new DriverService();
