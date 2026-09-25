import { prisma } from '../config/database';
import { Prisma, FoodCategory, FoodItem } from '@prisma/client';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateFoodItemInput,
  UpdateFoodItemInput,
} from '../validators/menu.validator';

export class MenuRepository {
  // ==========================================
  // CATEGORIES
  // ==========================================

  async createCategory(slug: string, input: CreateCategoryInput): Promise<FoodCategory> {
    return prisma.foodCategory.create({
      data: {
        slug,
        name: input.name,
        iconUrl: input.iconUrl,
        sortOrder: input.sortOrder,
        restaurantId: input.restaurantId,
      },
    });
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<FoodCategory> {
    return prisma.foodCategory.update({
      where: { id },
      data: input,
    });
  }

  async deleteCategory(id: string): Promise<FoodCategory> {
    return prisma.foodCategory.delete({
      where: { id },
    });
  }

  async findCategoryById(id: string): Promise<FoodCategory | null> {
    return prisma.foodCategory.findUnique({
      where: { id },
    });
  }

  async findCategories(restaurantId?: string) {
    return prisma.foodCategory.findMany({
      where: {
        OR: [
          { restaurantId: null }, // Global platform categories
          ...(restaurantId ? [{ restaurantId }] : []),
        ],
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ==========================================
  // FOOD ITEMS & MENU
  // ==========================================

  async createFoodItem(input: CreateFoodItemInput): Promise<FoodItem> {
    return prisma.$transaction(async (tx) => {
      // 1. Create base food item
      const item = await tx.foodItem.create({
        data: {
          restaurantId: input.restaurantId,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          price: input.price,
          ingredients: input.ingredients,
          isAvailable: input.isAvailable,
          preparationTimeMin: input.preparationTimeMin,
          calories: input.calories,
        },
      });

      // 2. Create options & nested addons if provided
      if (input.options && input.options.length > 0) {
        for (const opt of input.options) {
          const createdOption = await tx.foodItemOption.create({
            data: {
              foodItemId: item.id,
              name: opt.name,
              type: opt.type,
              isRequired: opt.isRequired,
              minSelect: opt.minSelect,
              maxSelect: opt.maxSelect,
            },
          });

          if (opt.addons && opt.addons.length > 0) {
            await tx.foodAddon.createMany({
              data: opt.addons.map((addon) => ({
                foodItemId: item.id,
                optionId: createdOption.id,
                name: addon.name,
                price: addon.price,
                isAvailable: addon.isAvailable,
              })),
            });
          }
        }
      }

      // 3. Create standalone addons if provided
      if (input.standaloneAddons && input.standaloneAddons.length > 0) {
        await tx.foodAddon.createMany({
          data: input.standaloneAddons.map((addon) => ({
            foodItemId: item.id,
            name: addon.name,
            price: addon.price,
            isAvailable: addon.isAvailable,
          })),
        });
      }

      return item;
    });
  }

  async updateFoodItem(id: string, input: UpdateFoodItemInput): Promise<FoodItem> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { options, standaloneAddons, ...scalarFields } = input;
    return prisma.foodItem.update({
      where: { id },
      data: scalarFields,
    });
  }

  async toggleAvailability(id: string, isAvailable: boolean): Promise<FoodItem> {
    return prisma.foodItem.update({
      where: { id },
      data: { isAvailable },
    });
  }

  async updateFoodImage(id: string, imageUrl: string): Promise<FoodItem> {
    return prisma.foodItem.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async deleteFoodItem(id: string): Promise<FoodItem> {
    return prisma.foodItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findFoodItemById(id: string) {
    return prisma.foodItem.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            isActive: true,
            isApproved: true,
            deliveryFeeBase: true,
            estimatedDeliveryMin: true,
            estimatedDeliveryMax: true,
          },
        },
        options: {
          include: {
            addons: true,
          },
        },
        addons: {
          where: { optionId: null }, // standalone add-ons
        },
      },
    });
  }

  async findRestaurantMenu(restaurantId: string) {
    const isAll = restaurantId === 'all';
    const foodItemWhere: Prisma.FoodItemWhereInput = {
      ...(isAll ? {} : { restaurantId }),
      deletedAt: null,
    };

    // Fetch categories associated with this restaurant or containing food items
    const categories = await prisma.foodCategory.findMany({
      where: {
        isActive: true,
        foodItems: {
          some: foodItemWhere,
        },
      },
      include: {
        foodItems: {
          where: foodItemWhere,
          orderBy: { name: 'asc' },
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
              },
            },
            options: {
              include: {
                addons: true,
              },
            },
            addons: {
              where: { optionId: null },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }

  async searchFoodItems(params: {
    query: string;
    restaurantId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    page: number;
    limit: number;
  }) {
    const where: Prisma.FoodItemWhereInput = {
      deletedAt: null,
      isAvailable: true,
      restaurant: {
        isActive: true,
        isApproved: true,
        deletedAt: null,
      },
      OR: [
        { name: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { ingredients: { has: params.query } },
      ],
    };

    if (params.restaurantId) {
      where.restaurantId = params.restaurantId;
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) where.price.gte = params.minPrice;
      if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
    }

    const skip = (params.page - 1) * params.limit;

    const [total, items] = await Promise.all([
      prisma.foodItem.count({ where }),
      prisma.foodItem.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { ratingAverage: 'desc' },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              ratingAverage: true,
              deliveryFeeBase: true,
              estimatedDeliveryMin: true,
              estimatedDeliveryMax: true,
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return { total, items };
  }
}

export const menuRepository = new MenuRepository();
