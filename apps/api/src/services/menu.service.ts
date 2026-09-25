import crypto from 'crypto';
import { UserRoleEnum } from '@prisma/client';
import { menuRepository } from '../repositories/menu.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { storageService } from './storage.service';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateFoodItemInput,
  UpdateFoodItemInput,
  FoodSearchQueryParams,
} from '../validators/menu.validator';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { PaginatedResult } from '@food-delivery/shared';

export class MenuService {
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const randomSuffix = crypto.randomBytes(2).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async createCategory(
    userId: string,
    userRoles: UserRoleEnum[],
    input: CreateCategoryInput
  ) {
    if (input.restaurantId) {
      const restaurant = await restaurantRepository.findById(input.restaurantId);
      if (!restaurant) {
        throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
      }
      const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
      if (restaurant.ownerId !== userId && !isAdmin) {
        throw new ForbiddenError('You do not own this restaurant.', ErrorCode.FORBIDDEN);
      }
    } else {
      // Global categories can only be created by ADMIN
      if (!userRoles.includes(UserRoleEnum.ADMIN)) {
        throw new ForbiddenError('Only administrators can create global categories.', ErrorCode.FORBIDDEN);
      }
    }

    const slug = this.generateSlug(input.name);
    return menuRepository.createCategory(slug, input);
  }

  async updateCategory(
    id: string,
    userId: string,
    userRoles: UserRoleEnum[],
    input: UpdateCategoryInput
  ) {
    const category = await menuRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundError('Category not found.', ErrorCode.NOT_FOUND);
    }

    if (category.restaurantId) {
      const restaurant = await restaurantRepository.findById(category.restaurantId);
      const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
      if (restaurant && restaurant.ownerId !== userId && !isAdmin) {
        throw new ForbiddenError('You do not have permission to edit this category.', ErrorCode.FORBIDDEN);
      }
    } else if (!userRoles.includes(UserRoleEnum.ADMIN)) {
      throw new ForbiddenError('Only administrators can modify global categories.', ErrorCode.FORBIDDEN);
    }

    return menuRepository.updateCategory(id, input);
  }

  async deleteCategory(id: string, userId: string, userRoles: UserRoleEnum[]) {
    const category = await menuRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundError('Category not found.', ErrorCode.NOT_FOUND);
    }

    if (category.restaurantId) {
      const restaurant = await restaurantRepository.findById(category.restaurantId);
      const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
      if (restaurant && restaurant.ownerId !== userId && !isAdmin) {
        throw new ForbiddenError('You do not have permission to delete this category.', ErrorCode.FORBIDDEN);
      }
    } else if (!userRoles.includes(UserRoleEnum.ADMIN)) {
      throw new ForbiddenError('Only administrators can delete global categories.', ErrorCode.FORBIDDEN);
    }

    return menuRepository.deleteCategory(id);
  }

  async getCategories(restaurantId?: string) {
    return menuRepository.findCategories(restaurantId);
  }

  // ==========================================
  // FOOD ITEMS & MENU
  // ==========================================

  async createFoodItem(
    userId: string,
    userRoles: UserRoleEnum[],
    input: CreateFoodItemInput
  ) {
    const restaurant = await restaurantRepository.findById(input.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    if (restaurant.ownerId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not own this restaurant.', ErrorCode.FORBIDDEN);
    }

    const category = await menuRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found.', ErrorCode.NOT_FOUND);
    }

    const item = await menuRepository.createFoodItem(input);
    return menuRepository.findFoodItemById(item.id);
  }

  async updateFoodItem(
    id: string,
    userId: string,
    userRoles: UserRoleEnum[],
    input: UpdateFoodItemInput
  ) {
    const item = await menuRepository.findFoodItemById(id);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    if (item.restaurant.ownerId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to modify this food item.', ErrorCode.FORBIDDEN);
    }

    await menuRepository.updateFoodItem(id, input);
    return menuRepository.findFoodItemById(id);
  }

  async toggleAvailability(
    id: string,
    userId: string,
    userRoles: UserRoleEnum[],
    isAvailable: boolean
  ) {
    const item = await menuRepository.findFoodItemById(id);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    if (item.restaurant.ownerId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to modify this food item.', ErrorCode.FORBIDDEN);
    }

    return menuRepository.toggleAvailability(id, isAvailable);
  }

  async deleteFoodItem(id: string, userId: string, userRoles: UserRoleEnum[]) {
    const item = await menuRepository.findFoodItemById(id);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    if (item.restaurant.ownerId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to delete this food item.', ErrorCode.FORBIDDEN);
    }

    return menuRepository.deleteFoodItem(id);
  }

  async getFoodItemDetails(id: string) {
    const item = await menuRepository.findFoodItemById(id);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }
    return item;
  }

  async getRestaurantMenu(restaurantId: string) {
    if (restaurantId === 'all') {
      const categories = await menuRepository.findRestaurantMenu('all');
      return {
        restaurant: {
          id: 'all',
          name: 'All Restaurants',
          slug: 'all-restaurants',
        },
        categories,
      };
    }

    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const categories = await menuRepository.findRestaurantMenu(restaurantId);
    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        bannerUrl: restaurant.bannerUrl,
        logoUrl: restaurant.logoUrl,
        ratingAverage: restaurant.ratingAverage,
        ratingCount: restaurant.ratingCount,
        deliveryFeeBase: restaurant.deliveryFeeBase,
        estimatedDeliveryMin: restaurant.estimatedDeliveryMin,
        estimatedDeliveryMax: restaurant.estimatedDeliveryMax,
      },
      categories,
    };
  }

  async searchFood(params: FoodSearchQueryParams): Promise<PaginatedResult<unknown>> {
    const { total, items } = await menuRepository.searchFoodItems(params);
    const totalPages = Math.ceil(total / params.limit);

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: totalPages || 1,
    };
  }

  async uploadFoodImage(
    foodItemId: string,
    userId: string,
    userRoles: UserRoleEnum[],
    fileBuffer: Buffer,
    originalFilename?: string
  ) {
    const item = await menuRepository.findFoodItemById(foodItemId);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    if (item.restaurant.ownerId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to update this food image.', ErrorCode.FORBIDDEN);
    }

    const imageUrl = await storageService.uploadImage(fileBuffer, 'foods', originalFilename);
    return menuRepository.updateFoodImage(foodItemId, imageUrl);
  }

  async snoozeFoodItem(
    foodItemId: string,
    duration: '2_HOURS' | 'REST_OF_DAY' | 'INDEFINITE' = 'REST_OF_DAY'
  ) {
    const item = await menuRepository.findFoodItemById(foodItemId);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    let snoozedUntil: string | null = null;
    const now = new Date();
    if (duration === '2_HOURS') {
      snoozedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    } else if (duration === 'REST_OF_DAY') {
      const eod = new Date(now);
      eod.setHours(23, 59, 59, 999);
      snoozedUntil = eod.toISOString();
    }

    const updated = await menuRepository.toggleAvailability(foodItemId, false);

    return {
      id: updated.id,
      name: updated.name,
      isAvailable: false,
      snoozedUntil,
      message: `Item '${updated.name}' marked out of stock (86'd) for ${duration.replace('_', ' ').toLowerCase()}`,
    };
  }

  async unsnoozeFoodItem(foodItemId: string) {
    const item = await menuRepository.findFoodItemById(foodItemId);
    if (!item) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    const updated = await menuRepository.toggleAvailability(foodItemId, true);

    return {
      id: updated.id,
      name: updated.name,
      isAvailable: true,
      snoozedUntil: null,
      message: `Item '${updated.name}' restored to active stock`,
    };
  }
}

export const menuService = new MenuService();
