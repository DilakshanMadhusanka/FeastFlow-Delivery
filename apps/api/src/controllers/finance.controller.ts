import { Request, Response, NextFunction } from 'express';
import { financeService } from '../services/finance.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { HttpStatus } from '../constants';

export class FinanceController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { restaurantId } = req.query as { restaurantId?: string };
      const summary = await financeService.getFinancialSummary(
        { userId: req.user.id, roles: req.user.roles },
        restaurantId
      );
      sendSuccess(res, summary, 'Financial summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { restaurantId, page, limit, startDate, endDate } = req.query as {
        restaurantId?: string;
        page?: string;
        limit?: string;
        startDate?: string;
        endDate?: string;
      };
      const ledger = await financeService.getFinancialLedger(
        { userId: req.user.id, roles: req.user.roles },
        {
          restaurantId,
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 50,
          startDate,
          endDate,
        }
      );
      sendSuccess(res, ledger, 'Financial ledger retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async processPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const payout = await financeService.processPayout(
        { userId: req.user.id, roles: req.user.roles },
        req.body
      );
      sendSuccess(res, payout, 'Payout processed successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }
}

export const financeController = new FinanceController();
