import { Request, Response, NextFunction } from 'express';
import { driverService } from '../services/driver.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { HttpStatus } from '../constants';

export class DriverController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const profile = await driverService.getOrCreateDriverProfile(req.user.id, req.user.roles);
      sendSuccess(res, profile, 'Driver profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const driver = await driverService.registerDriver(req.user.id, req.body);
      sendSuccess(res, driver, 'Driver registered successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await driverService.toggleOnlineStatus(req.user.id, req.body);
      sendSuccess(res, result, 'Driver status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await driverService.updateLocation(req.user.id, req.body);
      sendSuccess(res, result, 'Location recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async getJobRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { lat, lng } = req.query as { lat?: string; lng?: string };
      const jobs = await driverService.getJobRequests(
        req.user.id,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined
      );
      sendSuccess(res, jobs, 'Available delivery requests retrieved');
    } catch (error) {
      next(error);
    }
  }

  async acceptJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { orderId } = req.params;
      const assignment = await driverService.acceptJob(req.user.id, orderId);
      sendSuccess(res, assignment, 'Delivery job accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getActiveDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const active = await driverService.getActiveDelivery(req.user.id);
      sendSuccess(res, active, 'Active delivery retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async advanceStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { step, notes } = req.body;
      const updated = await driverService.advanceWorkflowStep(req.user.id, step, notes);
      sendSuccess(res, updated, 'Delivery step advanced successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const earnings = await driverService.getEarnings(req.user.id);
      sendSuccess(res, earnings, 'Driver earnings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const driverController = new DriverController();
