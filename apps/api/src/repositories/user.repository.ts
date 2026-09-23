import { prisma } from '../config/database';
import { User, UserRoleEnum } from '@prisma/client';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: UserRoleEnum;
}

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone, deletedAt: null },
    });
  }

  async createUser(data: CreateUserData): Promise<User> {
    return prisma.$transaction(async (tx) => {
      // Find or create role
      let role = await tx.role.findUnique({
        where: { name: data.role },
      });

      if (!role) {
        role = await tx.role.create({
          data: { name: data.role },
        });
      }

      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          name: data.name,
          phone: data.phone,
        },
      });

      // Link role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // If user registered as DELIVERY_DRIVER, initialize driver profile
      if (data.role === UserRoleEnum.DELIVERY_DRIVER) {
        await tx.deliveryDriver.create({
          data: {
            userId: user.id,
            isOnline: false,
            isVerified: false,
          },
        });
      }

      return user;
    });
  }

  async updateUser(id: string, data: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl' | 'passwordHash' | 'isEmailVerified'>>) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  async addRole(userId: string, roleName: UserRoleEnum) {
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await prisma.role.create({ data: { name: roleName } });
    }

    return prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }
}

export const userRepository = new UserRepository();
