import { prisma } from '../config/database';
import { UserRoleEnum, VehicleTypeEnum } from '@prisma/client';
import { hashPassword } from '../utils/token';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';
import { CreateAdminUserInput, QueryAdminUsersInput, UpdateUserStatusInput } from '../validators/admin-user.validator';

export class AdminUserService {
  /**
   * Provision a brand-new user for the FeastFlow mobile application (Customer or Delivery Courier).
   */
  async createUser(input: CreateAdminUserInput, adminUserId?: string) {
    const cleanEmail = input.email.trim().toLowerCase();

    // 1. Verify email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // 2. Verify phone uniqueness if provided
    if (input.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone) {
        throw new ConflictError('This phone number is already registered to another account.');
      }
    }

    // 3. Hash the initial password
    const passwordHash = await hashPassword(input.password);

    // 4. Atomically persist user and assigned role
    const createdUser = await prisma.$transaction(async (tx: any) => {
      // Find or create the target system role
      let role = await tx.role.findUnique({
        where: { name: input.role },
      });
      if (!role) {
        role = await tx.role.create({
          data: {
            name: input.role,
            description: `${input.role.replace('_', ' ')} role`,
          },
        });
      }

      // Create the user profile
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: input.name.trim(),
          phone: input.phone || null,
          isEmailVerified: input.isEmailVerified ?? true,
          isActive: input.isActive ?? true,
        },
      });

      // Link role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // If provisioned as a mobile DELIVERY_DRIVER, initialize driver profile
      if (input.role === UserRoleEnum.DELIVERY_DRIVER) {
        const isVerified = input.isVerified !== undefined ? input.isVerified : true;
        const vehicleType = input.vehicleType || VehicleTypeEnum.MOTORCYCLE;

        const driver = await tx.deliveryDriver.create({
          data: {
            userId: user.id,
            vehicleType,
            licensePlate: input.licensePlate?.trim() || null,
            isVerified,
            isOnline: false,
            currentLatitude: 40.7128,
            currentLongitude: -74.0060,
          },
        });

        // Initialize GPS location log for radar dispatch
        await tx.driverLocation.create({
          data: {
            driverId: driver.id,
            latitude: 40.7128,
            longitude: -74.0060,
          },
        });
      }

      return user;
    });

    // 5. Query complete user details for return
    return this.getUserById(createdUser.id);
  }

  /**
   * Fetch a single user by ID with full roles and driver profile.
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        userRoles: {
          include: { role: true },
        },
        driverProfile: true,
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      driverProfile: user.driverProfile
        ? {
            id: user.driverProfile.id,
            vehicleType: user.driverProfile.vehicleType,
            licensePlate: user.driverProfile.licensePlate,
            isVerified: user.driverProfile.isVerified,
            isOnline: user.driverProfile.isOnline,
            ratingAverage: Number(user.driverProfile.ratingAverage),
            totalDeliveries: user.driverProfile.totalDeliveries,
          }
        : null,
      ordersCount: user._count.orders,
      addressesCount: user._count.addresses,
    };
  }

  /**
   * List users with search, role filters, and pagination.
   */
  async listUsers(query: QueryAdminUsersInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: {
            name: query.role as UserRoleEnum,
          },
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: {
            include: { role: true },
          },
          driverProfile: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Aggregate overall metrics for the admin dashboard
    const [totalUsers, totalCustomers, totalDrivers, verifiedDrivers] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          userRoles: { some: { role: { name: UserRoleEnum.CUSTOMER } } },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          userRoles: { some: { role: { name: UserRoleEnum.DELIVERY_DRIVER } } },
        },
      }),
      prisma.deliveryDriver.count({
        where: { isVerified: true },
      }),
    ]);

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      isEmailVerified: u.isEmailVerified,
      isActive: u.isActive,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur: any) => ur.role.name),
      driverProfile: u.driverProfile
        ? {
            id: u.driverProfile.id,
            vehicleType: u.driverProfile.vehicleType,
            licensePlate: u.driverProfile.licensePlate,
            isVerified: u.driverProfile.isVerified,
            isOnline: u.driverProfile.isOnline,
            ratingAverage: Number(u.driverProfile.ratingAverage),
            totalDeliveries: u.driverProfile.totalDeliveries,
          }
        : null,
      ordersCount: u._count.orders,
      addressesCount: u._count.addresses,
    }));

    return {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        totalUsers,
        totalCustomers,
        totalDrivers,
        verifiedDrivers,
      },
    };
  }

  /**
   * Update active or verified status for a user.
   */
  async updateUserStatus(userId: string, input: UpdateUserStatusInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { driverProfile: true },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (input.isActive !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: input.isActive },
      });
    }

    if (input.isVerified !== undefined && user.driverProfile) {
      await prisma.deliveryDriver.update({
        where: { id: user.driverProfile.id },
        data: { isVerified: input.isVerified },
      });
    }

    return this.getUserById(userId);
  }

  /**
   * Soft delete a user account.
   */
  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // If driver, take offline
    await prisma.deliveryDriver.updateMany({
      where: { userId },
      data: { isOnline: false },
    });

    return { success: true, message: 'User deleted successfully.' };
  }
}

export const adminUserService = new AdminUserService();
