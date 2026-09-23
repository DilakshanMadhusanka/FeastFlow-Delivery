import { prisma } from '../config/database';
import { CreateAddressInput, UpdateAddressInput } from '../validators/address.validator';
import { Address } from '@prisma/client';

export class AddressRepository {
  async findAddressesByUserId(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAddressById(id: string): Promise<Address | null> {
    return prisma.address.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
    return prisma.$transaction(async (tx) => {
      // If setting as default, clear existing default for this user
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // If user has no existing addresses, make this one default automatically
      const count = await tx.address.count({ where: { userId, deletedAt: null } });
      const shouldBeDefault = count === 0 ? true : input.isDefault;

      return tx.address.create({
        data: {
          userId,
          title: input.title,
          type: input.type,
          street: input.street,
          apartment: input.apartment,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          latitude: input.latitude,
          longitude: input.longitude,
          deliveryInstructions: input.deliveryInstructions,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async updateAddress(id: string, userId: string, input: UpdateAddressInput): Promise<Address> {
    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: input,
      });
    });
  }

  async deleteAddress(id: string, userId: string): Promise<Address> {
    return prisma.address.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    });
  }

  async setDefaultAddress(id: string, userId: string): Promise<Address> {
    return prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id, userId },
        data: { isDefault: true },
      });
    });
  }
}

export const addressRepository = new AddressRepository();
