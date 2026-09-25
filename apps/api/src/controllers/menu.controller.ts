import { Request, Response, NextFunction } from 'express';
import { menuService } from '../services/menu.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { FoodSearchQueryParams } from '../validators/menu.validator';

export class MenuController {
  // ==========================================
  // CATEGORIES
  // ==========================================

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const category = await menuService.createCategory(req.user.id, req.user.roles, req.body);
      sendCreated(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updated = await menuService.updateCategory(id, req.user.id, req.user.roles, req.body);
      sendSuccess(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      await menuService.deleteCategory(id, req.user.id, req.user.roles);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.query.restaurantId as string | undefined;
      const categories = await menuService.getCategories(restaurantId);
      sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FOOD ITEMS & MENU
  // ==========================================

  async getRestaurantMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const menu = await menuService.getRestaurantMenu(restaurantId);
      sendSuccess(res, menu, 'Restaurant menu retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllRestaurantsMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const menu = await menuService.getRestaurantMenu('all');
      sendSuccess(res, menu, 'All restaurants menu retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFoodItemDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const item = await menuService.getFoodItemDetails(id);
      sendSuccess(res, item, 'Food item details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createFoodItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const item = await menuService.createFoodItem(req.user.id, req.user.roles, req.body);
      sendCreated(res, item, 'Food item created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateFoodItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updated = await menuService.updateFoodItem(id, req.user.id, req.user.roles, req.body);
      sendSuccess(res, updated, 'Food item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { isAvailable } = req.body;
      const updated = await menuService.toggleAvailability(id, req.user.id, req.user.roles, isAvailable);
      sendSuccess(
        res,
        updated,
        `Food item marked as ${isAvailable ? 'available' : 'unavailable'}`
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteFoodItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      await menuService.deleteFoodItem(id, req.user.id, req.user.roles);
      sendSuccess(res, null, 'Food item deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadFoodImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (!req.file) {
        throw new BadRequestError('Image file is required', ErrorCode.BAD_REQUEST);
      }

      const { id } = req.params;
      const updated = await menuService.uploadFoodImage(
        id,
        req.user.id,
        req.user.roles,
        req.file.buffer,
        req.file.originalname
      );

      sendSuccess(res, updated, 'Food item image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async searchFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams = req.query as unknown as FoodSearchQueryParams;
      const results = await menuService.searchFood(queryParams);
      sendSuccess(res, results, 'Food search results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const menuController = new MenuController();
