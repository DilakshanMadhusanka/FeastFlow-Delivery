import { BadRequestError, NotFoundError } from '../utils/errors';

export interface MarketingCampaign {
  id: string;
  restaurantId: string;
  name: string;
  type: 'HAPPY_HOUR' | 'BOGO' | 'FREE_DELIVERY' | 'WIN_BACK';
  discountValue: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  minOrderAmount: number;
  startTime?: string; // e.g. "14:00"
  endTime?: string;   // e.g. "17:00"
  applicableDays?: number[]; // [1, 2, 3, 4, 5]
  targetItemName?: string; // e.g. "Draft Beer" or "Cheeseburger"
  isActive: boolean;
  redemptionCount: number;
  createdAt: string;
}

let campaignStore: MarketingCampaign[] = [
  {
    id: 'camp-1',
    restaurantId: 'all',
    name: 'Weekday Afternoon Happy Hour',
    type: 'HAPPY_HOUR',
    discountValue: 20,
    discountType: 'PERCENTAGE',
    minOrderAmount: 15,
    startTime: '14:00',
    endTime: '17:00',
    applicableDays: [1, 2, 3, 4, 5],
    isActive: true,
    redemptionCount: 64,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-2',
    restaurantId: 'all',
    name: 'Free Delivery on Orders Over $35',
    type: 'FREE_DELIVERY',
    discountValue: 100,
    discountType: 'PERCENTAGE',
    minOrderAmount: 35,
    isActive: true,
    redemptionCount: 142,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-3',
    restaurantId: 'all',
    name: 'BOGO Pizza Friday Special',
    type: 'BOGO',
    discountValue: 100,
    discountType: 'PERCENTAGE',
    minOrderAmount: 25,
    targetItemName: 'Margherita Pizza',
    applicableDays: [5],
    isActive: false,
    redemptionCount: 38,
    createdAt: new Date().toISOString(),
  },
];

export class MarketingService {
  async getCampaigns(restaurantId?: string) {
    if (!restaurantId || restaurantId === 'all') {
      return campaignStore;
    }
    return campaignStore.filter((c) => c.restaurantId === 'all' || c.restaurantId === restaurantId);
  }

  async createCampaign(input: Omit<MarketingCampaign, 'id' | 'redemptionCount' | 'createdAt'>) {
    if (!input.name) throw new BadRequestError('Campaign name is required');

    const newCampaign: MarketingCampaign = {
      ...input,
      id: `camp_${Date.now()}`,
      restaurantId: input.restaurantId || 'all',
      redemptionCount: 0,
      createdAt: new Date().toISOString(),
    };

    campaignStore.unshift(newCampaign);
    return newCampaign;
  }

  async toggleCampaign(id: string) {
    const c = campaignStore.find((x) => x.id === id);
    if (!c) throw new NotFoundError('Campaign not found');

    c.isActive = !c.isActive;
    return c;
  }

  async deleteCampaign(id: string) {
    const index = campaignStore.findIndex((x) => x.id === id);
    if (index === -1) throw new NotFoundError('Campaign not found');

    campaignStore.splice(index, 1);
    return { success: true };
  }
}

export const marketingService = new MarketingService();
