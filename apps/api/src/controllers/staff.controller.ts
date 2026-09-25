import { Request, Response, NextFunction } from 'express';
import { staffService } from '../services/staff.service';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../constants';

export class StaffController {
  async getStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.query as { restaurantId?: string };
      const staff = await staffService.getStaff(restaurantId);
      sendSuccess(res, staff, 'Staff retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await staffService.addStaff(req.body);
      sendSuccess(res, staff, 'Staff member added successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async verifyPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin, restaurantId } = req.body;
      const result = await staffService.verifyPin(pin, restaurantId);
      sendSuccess(res, result, 'PIN verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const staff = await staffService.toggleShift(id);
      sendSuccess(res, staff, 'Staff shift updated');
    } catch (error) {
      next(error);
    }
  }

  async removeStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await staffService.removeStaff(id);
      sendSuccess(res, result, 'Staff member removed');
    } catch (error) {
      next(error);
    }
  }
}

export const staffController = new StaffController();
