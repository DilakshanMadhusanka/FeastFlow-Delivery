import { Request, Response, NextFunction } from 'express';
import { adminUserService } from '../services/admin-user.service';
import { sendCreated, sendSuccess } from '../utils/response';

export class AdminUserController {
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await adminUserService.createUser(req.body, (req as any).user?.id);
      sendCreated(res, user, `Mobile app user (${user.name}) created successfully.`);
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminUserService.listUsers(req.query as any);
      sendSuccess(res, result, 'Users retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await adminUserService.updateUserStatus(id, req.body);
      sendSuccess(res, updated, 'User status updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminUserService.deleteUser(id);
      sendSuccess(res, result, 'User deleted successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export const adminUserController = new AdminUserController();
