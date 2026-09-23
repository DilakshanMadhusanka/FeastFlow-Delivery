import { Request, Response, NextFunction } from 'express';
import { restaurantService } from '../services/restaurant.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { RestaurantSearchQueryParams } from '../validators/restaurant.validator';
import { UserRoleEnum } from '@prisma/client';

export class RestaurantController {
  async searchRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams = req.query as unknown as RestaurantSearchQueryParams;
      const result = await restaurantService.searchRestaurants(queryParams);
      sendSuccess(res, result, 'Restaurants retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      const lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const userCoords = lat && lng ? { latitude: lat, longitude: lng } : undefined;

      const restaurant = await restaurantService.getRestaurantById(id, userCoords);
      sendSuccess(res, restaurant, 'Restaurant details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      const lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const userCoords = lat && lng ? { latitude: lat, longitude: lng } : undefined;

      const restaurant = await restaurantService.getRestaurantBySlug(slug, userCoords);
      sendSuccess(res, restaurant, 'Restaurant details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const userRoles = (req.user.roles || []) as unknown as UserRoleEnum[];
      const restaurants = await restaurantService.getMyRestaurants(req.user.id, userRoles);
      sendSuccess(res, restaurants, 'Owner restaurants retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const restaurant = await restaurantService.createRestaurant(req.user.id, req.body);
      sendCreated(res, restaurant, 'Restaurant submitted successfully. Awaiting approval.');
    } catch (error) {
      next(error);
    }
  }

  async updateRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updated = await restaurantService.updateRestaurant(id, req.user.id, req.user.roles, req.body);
      sendSuccess(res, updated, 'Restaurant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updatedHours = await restaurantService.updateOperatingHours(
        id,
        req.user.id,
        req.user.roles,
        req.body.hours
      );
      sendSuccess(res, updatedHours, 'Operating hours updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (!req.file) {
        throw new BadRequestError('Image file is required', ErrorCode.BAD_REQUEST);
      }

      const { id } = req.params;
      const updated = await restaurantService.uploadMedia(
        id,
        req.user.id,
        req.user.roles,
        'logo',
        req.file.buffer,
        req.file.originalname
      );

      sendSuccess(res, updated, 'Restaurant logo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (!req.file) {
        throw new BadRequestError('Image file is required', ErrorCode.BAD_REQUEST);
      }

      const { id } = req.params;
      const updated = await restaurantService.uploadMedia(
        id,
        req.user.id,
        req.user.roles,
        'banner',
        req.file.buffer,
        req.file.originalname
      );

      sendSuccess(res, updated, 'Restaurant banner uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const restaurantController = new RestaurantController();
