import { prisma } from '../config/database';
import { Prisma, Restaurant } from '@prisma/client';
import { CreateRestaurantInput, UpdateRestaurantInput } from '../validators/restaurant.validator';

export class RestaurantRepository {
  async create(ownerId: string, slug: string, input: CreateRestaurantInput): Promise<Restaurant> {
    return prisma.$transaction(async (tx) => {
      const targetOwnerId = input.ownerId || ownerId;
      const isApproved = input.isApproved !== undefined ? input.isApproved : true;

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: targetOwnerId,
          slug,
          name: input.name,
          description: input.description,
          phone: input.phone,
          email: input.email,
          street: input.street,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          deliveryRadiusKm: input.deliveryRadiusKm,
          minimumOrderAmount: input.minimumOrderAmount,
          deliveryFeeBase: input.deliveryFeeBase,
          estimatedDeliveryMin: input.estimatedDeliveryMin,
          estimatedDeliveryMax: input.estimatedDeliveryMax,
          isApproved,
          isActive: true,
        },
      });

      // Insert 7-day operating hours
      const hoursData =
        input.operatingHours && input.operatingHours.length === 7
          ? input.operatingHours
          : [0, 1, 2, 3, 4, 5, 6].map((day) => ({
              dayOfWeek: day,
              openTime: '09:00',
              closeTime: '22:00',
              isClosed: false,
            }));

      await tx.restaurantHour.createMany({
        data: hoursData.map((h) => ({
          restaurantId: restaurant.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
      });

      // Link categories if provided
      if (input.categoryIds && input.categoryIds.length > 0) {
        await tx.restaurantCategory.createMany({
          data: input.categoryIds.map((catId) => ({
            restaurantId: restaurant.id,
            foodCategoryId: catId,
          })),
        });
      }

      return restaurant;
    });
  }

  async findById(id: string) {
    return prisma.restaurant.findUnique({
      where: { id, deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        operatingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        categoryLinks: {
          include: { category: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.restaurant.findUnique({
      where: { slug, deletedAt: null },
      include: {
        operatingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        categoryLinks: {
          include: { category: true },
        },
      },
    });
  }

  async findByOwnerId(ownerId: string) {
    return prisma.restaurant.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        operatingHours: true,
        categoryLinks: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return prisma.restaurant.findMany({
      where: { deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        operatingHours: true,
        categoryLinks: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateRestaurantInput): Promise<Restaurant> {
    const { categoryIds, operatingHours, ...scalarFields } = input;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.restaurant.update({
        where: { id },
        data: scalarFields,
      });

      if (categoryIds) {
        await tx.restaurantCategory.deleteMany({ where: { restaurantId: id } });
        if (categoryIds.length > 0) {
          await tx.restaurantCategory.createMany({
            data: categoryIds.map((foodCategoryId) => ({
              restaurantId: id,
              foodCategoryId,
            })),
          });
        }
      }

      if (operatingHours && operatingHours.length === 7) {
        await tx.restaurantHour.deleteMany({ where: { restaurantId: id } });
        await tx.restaurantHour.createMany({
          data: operatingHours.map((h) => ({
            restaurantId: id,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          })),
        });
      }

      return updated;
    });
  }

  async updateOperatingHours(restaurantId: string, hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>) {
    return prisma.$transaction(async (tx) => {
      await tx.restaurantHour.deleteMany({ where: { restaurantId } });
      await tx.restaurantHour.createMany({
        data: hours.map((h) => ({
          restaurantId,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
      });

      return tx.restaurantHour.findMany({
        where: { restaurantId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  async updateMedia(id: string, media: { logoUrl?: string; bannerUrl?: string }) {
    return prisma.restaurant.update({
      where: { id },
      data: media,
    });
  }

  async searchAndFilter(params: {
    query?: string;
    categoryId?: string;
    maxDeliveryFee?: number;
    minRating?: number;
    sortBy?: 'distance' | 'rating' | 'deliveryTime' | 'deliveryFee' | 'name';
    sortOrder?: 'asc' | 'desc';
    page: number;
    limit: number;
  }) {
    const where: Prisma.RestaurantWhereInput = {
      isApproved: true,
      isActive: true,
      deletedAt: null,
    };

    if (params.query) {
      where.OR = [
        { name: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        {
          categoryLinks: {
            some: {
              category: {
                name: { contains: params.query, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    if (params.categoryId) {
      where.categoryLinks = {
        some: { foodCategoryId: params.categoryId },
      };
    }

    if (params.maxDeliveryFee !== undefined) {
      where.deliveryFeeBase = { lte: params.maxDeliveryFee };
    }

    if (params.minRating !== undefined) {
      where.ratingAverage = { gte: params.minRating };
    }

    // Determine database-level sort order
    let orderBy: Prisma.RestaurantOrderByWithRelationInput = { ratingAverage: 'desc' };
    if (params.sortBy === 'deliveryTime') {
      orderBy = { estimatedDeliveryMin: params.sortOrder || 'asc' };
    } else if (params.sortBy === 'deliveryFee') {
      orderBy = { deliveryFeeBase: params.sortOrder || 'asc' };
    } else if (params.sortBy === 'name') {
      orderBy = { name: params.sortOrder || 'asc' };
    } else if (params.sortBy === 'rating') {
      orderBy = { ratingAverage: params.sortOrder || 'desc' };
    }

    const skip = (params.page - 1) * params.limit;

    const [total, items] = await Promise.all([
      prisma.restaurant.count({ where }),
      prisma.restaurant.findMany({
        where,
        orderBy,
        skip,
        take: params.limit,
        include: {
          operatingHours: {
            orderBy: { dayOfWeek: 'asc' },
          },
          categoryLinks: {
            include: { category: true },
          },
        },
      }),
    ]);

    return { total, items };
  }
}

export const restaurantRepository = new RestaurantRepository();
