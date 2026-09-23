import { Request, Response, NextFunction } from 'express';
import { addressService } from '../services/address.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class AddressController {
  async getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const addresses = await addressService.getUserAddresses(req.user.id);
      sendSuccess(res, addresses, 'Addresses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAddressById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const address = await addressService.getAddressById(id, req.user.id);
      sendSuccess(res, address, 'Address retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const address = await addressService.createAddress(req.user.id, req.body);
      sendCreated(res, address, 'Address created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updated = await addressService.updateAddress(id, req.user.id, req.body);
      sendSuccess(res, updated, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      await addressService.deleteAddress(id, req.user.id);
      sendSuccess(res, null, 'Address deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const updated = await addressService.setDefaultAddress(id, req.user.id);
      sendSuccess(res, updated, 'Default address updated');
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
