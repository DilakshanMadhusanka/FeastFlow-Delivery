import { Request, Response, NextFunction } from 'express';
import { marketingService } from '../services/marketing.service';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../constants';

export class MarketingController {
  async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.query as { restaurantId?: string };
      const campaigns = await marketingService.getCampaigns(restaurantId);
      sendSuccess(res, campaigns, 'Marketing campaigns retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await marketingService.createCampaign(req.body);
      sendSuccess(res, campaign, 'Campaign created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async toggleCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await marketingService.toggleCampaign(id);
      sendSuccess(res, campaign, 'Campaign status updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await marketingService.deleteCampaign(id);
      sendSuccess(res, result, 'Campaign deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const marketingController = new MarketingController();
