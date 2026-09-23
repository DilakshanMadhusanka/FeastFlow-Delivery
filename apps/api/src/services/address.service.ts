import { addressRepository } from '../repositories/address.repository';
import { CreateAddressInput, UpdateAddressInput } from '../validators/address.validator';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ErrorCode } from '../constants';

export class AddressService {
  async getUserAddresses(userId: string) {
    return addressRepository.findAddressesByUserId(userId);
  }

  async getAddressById(id: string, userId: string) {
    const address = await addressRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address not found.', ErrorCode.NOT_FOUND);
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this address.', ErrorCode.FORBIDDEN);
    }
    return address;
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    return addressRepository.createAddress(userId, input);
  }

  async updateAddress(id: string, userId: string, input: UpdateAddressInput) {
    const address = await addressRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address not found.', ErrorCode.NOT_FOUND);
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this address.', ErrorCode.FORBIDDEN);
    }
    return addressRepository.updateAddress(id, userId, input);
  }

  async deleteAddress(id: string, userId: string) {
    const address = await addressRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address not found.', ErrorCode.NOT_FOUND);
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this address.', ErrorCode.FORBIDDEN);
    }
    return addressRepository.deleteAddress(id, userId);
  }

  async setDefaultAddress(id: string, userId: string) {
    const address = await addressRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address not found.', ErrorCode.NOT_FOUND);
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this address.', ErrorCode.FORBIDDEN);
    }
    return addressRepository.setDefaultAddress(id, userId);
  }
}

export const addressService = new AddressService();
