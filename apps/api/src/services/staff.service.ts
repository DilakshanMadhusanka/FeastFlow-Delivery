import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface StaffMember {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'LINE_COOK' | 'CASHIER' | 'MANAGER' | 'OWNER';
  stationPin: string; // 4-digit PIN
  isOnShift: boolean;
  createdAt: string;
}

// In-memory staff repository
let staffStore: StaffMember[] = [
  {
    id: 'staff-1',
    restaurantId: 'all',
    name: 'Carlos Mendez',
    email: 'carlos.cook@feastflow.com',
    phone: '+1 555-019-2831',
    role: 'LINE_COOK',
    stationPin: '1234',
    isOnShift: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    restaurantId: 'all',
    name: 'Alicia Keyser',
    email: 'alicia.cashier@feastflow.com',
    phone: '+1 555-019-9482',
    role: 'CASHIER',
    stationPin: '4321',
    isOnShift: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-3',
    restaurantId: 'all',
    name: 'David Zhao',
    email: 'david.manager@feastflow.com',
    phone: '+1 555-019-3310',
    role: 'MANAGER',
    stationPin: '9900',
    isOnShift: false,
    createdAt: new Date().toISOString(),
  },
];

export class StaffService {
  async getStaff(restaurantId?: string) {
    if (!restaurantId || restaurantId === 'all') {
      return staffStore;
    }
    return staffStore.filter((s) => s.restaurantId === 'all' || s.restaurantId === restaurantId);
  }

  async addStaff(input: {
    restaurantId: string;
    name: string;
    email: string;
    phone?: string;
    role: 'LINE_COOK' | 'CASHIER' | 'MANAGER' | 'OWNER';
    stationPin: string;
  }) {
    if (!input.name || !input.email) {
      throw new BadRequestError('Name and email are required');
    }
    if (!input.stationPin || input.stationPin.length !== 4) {
      throw new BadRequestError('Station PIN must be a 4-digit code');
    }

    const newStaff: StaffMember = {
      id: `staff_${Date.now()}`,
      restaurantId: input.restaurantId || 'all',
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      stationPin: input.stationPin,
      isOnShift: true,
      createdAt: new Date().toISOString(),
    };

    staffStore.unshift(newStaff);
    return newStaff;
  }

  async verifyPin(pin: string, restaurantId?: string) {
    const staff = staffStore.find(
      (s) =>
        s.stationPin === pin &&
        (s.restaurantId === 'all' || !restaurantId || s.restaurantId === restaurantId)
    );

    if (!staff) {
      throw new BadRequestError('Invalid 4-digit station PIN');
    }

    return {
      verified: true,
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
    };
  }

  async toggleShift(id: string) {
    const staff = staffStore.find((s) => s.id === id);
    if (!staff) throw new NotFoundError('Staff member not found');

    staff.isOnShift = !staff.isOnShift;
    return staff;
  }

  async removeStaff(id: string) {
    const index = staffStore.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundError('Staff member not found');

    staffStore.splice(index, 1);
    return { success: true };
  }
}

export const staffService = new StaffService();
