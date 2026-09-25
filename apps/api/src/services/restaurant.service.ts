import crypto from 'crypto';
import { UserRoleEnum } from '@prisma/client';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { storageService } from './storage.service';
import { calculateDistanceKm, isRestaurantOpen, GeoPoint } from '../utils/geo';
import {
  CreateRestaurantInput,
  UpdateRestaurantInput,
  RestaurantSearchQueryParams,
} from '../validators/restaurant.validator';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { PaginatedResult } from '@food-delivery/shared';

export class RestaurantService {
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  async createRestaurant(ownerId: string, input: CreateRestaurantInput, userRoles: UserRoleEnum[] = []) {
    const slug = this.generateSlug(input.name);

    // Verify slug uniqueness
    const existing = await restaurantRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictError('A restaurant with this name already exists. Please choose a slightly different name.');
    }

    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    const enrichedInput: CreateRestaurantInput = {
      ...input,
      isApproved: isAdmin ? (input.isApproved ?? true) : (input.isApproved ?? false),
    };

    const restaurant = await restaurantRepository.create(ownerId, slug, enrichedInput);
    return restaurantRepository.findById(restaurant.id);
  }

  async getRestaurantById(id: string, userCoords?: GeoPoint) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isOpen = isRestaurantOpen(restaurant.operatingHours);

    let distanceKm: number | undefined;
    let isDeliverable = true;

    if (userCoords && userCoords.latitude && userCoords.longitude) {
      distanceKm = calculateDistanceKm(userCoords, {
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      });
      isDeliverable = distanceKm <= restaurant.deliveryRadiusKm;
    }

    return {
      ...restaurant,
      isOpen,
      distanceKm,
      isDeliverable,
    };
  }

  async getRestaurantBySlug(slug: string, userCoords?: GeoPoint) {
    const restaurant = await restaurantRepository.findBySlug(slug);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isOpen = isRestaurantOpen(restaurant.operatingHours);

    let distanceKm: number | undefined;
    let isDeliverable = true;

    if (userCoords && userCoords.latitude && userCoords.longitude) {
      distanceKm = calculateDistanceKm(userCoords, {
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      });
      isDeliverable = distanceKm <= restaurant.deliveryRadiusKm;
    }

    return {
      ...restaurant,
      isOpen,
      distanceKm,
      isDeliverable,
    };
  }

  async getMyRestaurants(ownerId: string, userRoles: UserRoleEnum[] = []) {
    if (userRoles.includes(UserRoleEnum.ADMIN)) {
      return restaurantRepository.findAll();
    }
    return restaurantRepository.findByOwnerId(ownerId);
  }

  async updateRestaurant(
    id: string,
    requestingUserId: string,
    requestingRoles: UserRoleEnum[],
    input: UpdateRestaurantInput
  ) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isAdmin = requestingRoles.includes(UserRoleEnum.ADMIN);
    if (restaurant.ownerId !== requestingUserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to manage this restaurant.', ErrorCode.FORBIDDEN);
    }

    await restaurantRepository.update(id, input);
    return restaurantRepository.findById(id);
  }

  async updateOperatingHours(
    restaurantId: string,
    requestingUserId: string,
    requestingRoles: UserRoleEnum[],
    hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
  ) {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isAdmin = requestingRoles.includes(UserRoleEnum.ADMIN);
    if (restaurant.ownerId !== requestingUserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to manage this restaurant.', ErrorCode.FORBIDDEN);
    }

    return restaurantRepository.updateOperatingHours(restaurantId, hours);
  }

  async uploadMedia(
    restaurantId: string,
    requestingUserId: string,
    requestingRoles: UserRoleEnum[],
    type: 'logo' | 'banner',
    fileBuffer: Buffer,
    originalFilename?: string
  ) {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found.', ErrorCode.RESTAURANT_NOT_FOUND);
    }

    const isAdmin = requestingRoles.includes(UserRoleEnum.ADMIN);
    if (restaurant.ownerId !== requestingUserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to update this restaurant media.', ErrorCode.FORBIDDEN);
    }

    const mediaUrl = await storageService.uploadImage(fileBuffer, `restaurants/${type}s`, originalFilename);

    const updatePayload = type === 'logo' ? { logoUrl: mediaUrl } : { bannerUrl: mediaUrl };
    return restaurantRepository.updateMedia(restaurantId, updatePayload);
  }

  async searchRestaurants(params: RestaurantSearchQueryParams): Promise<PaginatedResult<unknown>> {
    const { total, items } = await restaurantRepository.searchAndFilter({
      query: params.query,
      categoryId: params.categoryId,
      maxDeliveryFee: params.maxDeliveryFee,
      minRating: params.minRating,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page,
      limit: params.limit,
    });

    const userCoords =
      params.latitude !== undefined && params.longitude !== undefined
        ? { latitude: params.latitude, longitude: params.longitude }
        : undefined;

    let enrichedItems = items.map((r) => {
      const isOpen = isRestaurantOpen(r.operatingHours);
      let distanceKm: number | undefined;
      let isDeliverable = true;

      if (userCoords) {
        distanceKm = calculateDistanceKm(userCoords, {
          latitude: r.latitude,
          longitude: r.longitude,
        });
        isDeliverable = distanceKm <= r.deliveryRadiusKm;
      }

      return {
        ...r,
        isOpen,
        distanceKm,
        isDeliverable,
        cuisines: r.categoryLinks.map((cl) => cl.category.name),
      };
    });

    // In-memory filter by open status if requested
    if (params.isOpen !== undefined) {
      enrichedItems = enrichedItems.filter((r) => r.isOpen === params.isOpen);
    }

    // In-memory sort by distance if user coordinates provided and sortBy is 'distance'
    if (params.sortBy === 'distance' && userCoords) {
      enrichedItems.sort((a, b) => {
        const distA = a.distanceKm ?? Infinity;
        const distB = b.distanceKm ?? Infinity;
        return params.sortOrder === 'desc' ? distB - distA : distA - distB;
      });
    }

    const totalPages = Math.ceil(total / params.limit);

    return {
      items: enrichedItems,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: totalPages || 1,
    };
  }
}

export const restaurantService = new RestaurantService();
