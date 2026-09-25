import { Request, Response, NextFunction } from 'express';
import { aiCopilotService } from '../services/ai-copilot.service';
import { sendSuccess } from '../utils/response';

export class AICopilotController {
  async generateMenuCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const copy = await aiCopilotService.generateMenuCopy(req.body);
      sendSuccess(res, copy, 'Menu copy generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateReviewReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reply = await aiCopilotService.generateReviewReply(req.body);
      sendSuccess(res, reply, 'Review reply generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDemandForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.query as { restaurantId?: string };
      const forecast = await aiCopilotService.getDemandForecast(restaurantId);
      sendSuccess(res, forecast, 'Demand forecast generated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const aiCopilotController = new AICopilotController();
