import { Request, Response, NextFunction } from 'express';
import { customerCrmService } from '../services/customer-crm.service';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../constants';

export class CustomerCrmController {
  async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.query as { restaurantId?: string };
      const customers = await customerCrmService.getCustomers(restaurantId);
      sendSuccess(res, customers, 'Customer profiles retrieved');
    } catch (error) {
      next(error);
    }
  }

  async issueCourtesyCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await customerCrmService.issueCourtesyCredit(id, req.body);
      sendSuccess(res, result, 'Courtesy credit issued successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }
}

export const customerCrmController = new CustomerCrmController();
