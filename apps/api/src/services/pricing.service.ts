import { Coupon, CouponDiscountTypeEnum } from '@prisma/client';
import { CartCalculationResult } from '@food-delivery/shared';

export interface CalculatedItem {
  name: string;
  unitPrice: number;
  addonsTotal: number;
  itemPriceWithAddons: number;
  quantity: number;
  lineSubtotal: number;
}

export class PricingService {
  private readonly TAX_RATE = 0.08875; // 8.875% Standard NYC Sales Tax
  private readonly SERVICE_FEE_RATE = 0.05; // 5% Service Fee
  private readonly MIN_SERVICE_FEE = 1.5; // Minimum $1.50 Service Fee

  calculateCart(params: {
    items: Array<{
      basePrice: number;
      addons: Array<{ price: number }>;
      quantity: number;
    }>;
    deliveryFeeBase: number;
    coupon?: Coupon | null;
  }): CartCalculationResult {
    let subtotal = 0;

    for (const item of params.items) {
      const addonsSum = item.addons.reduce((sum, a) => sum + Number(a.price), 0);
      const itemPriceWithAddons = Number(item.basePrice) + addonsSum;
      const lineSubtotal = itemPriceWithAddons * item.quantity;
      subtotal += lineSubtotal;
    }

    subtotal = this.round(subtotal);

    // If cart is empty, fees are zero
    if (subtotal === 0) {
      return {
        subtotal: 0,
        deliveryFee: 0,
        serviceFee: 0,
        discount: 0,
        tax: 0,
        total: 0,
      };
    }

    const deliveryFee = this.round(params.deliveryFeeBase);
    const serviceFee = this.round(Math.max(this.MIN_SERVICE_FEE, subtotal * this.SERVICE_FEE_RATE));

    // Calculate coupon discount
    let discount = 0;
    let couponCode: string | undefined;

    if (params.coupon && params.coupon.isActive) {
      const now = new Date();
      const isDateValid = now >= params.coupon.startDate && now <= params.coupon.endDate;
      const meetsMinAmount = subtotal >= Number(params.coupon.minimumAmount);

      if (isDateValid && meetsMinAmount) {
        couponCode = params.coupon.code;
        if (params.coupon.discountType === CouponDiscountTypeEnum.PERCENTAGE) {
          const rawDiscount = (subtotal * Number(params.coupon.discountValue)) / 100;
          const maxDiscount = params.coupon.maxDiscount ? Number(params.coupon.maxDiscount) : Infinity;
          discount = Math.min(rawDiscount, maxDiscount);
        } else {
          // Fixed discount
          discount = Number(params.coupon.discountValue);
        }
        discount = this.round(Math.min(discount, subtotal)); // Discount cannot exceed subtotal
      }
    }

    // Tax calculation on subtotal after discount
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = this.round(taxableAmount * this.TAX_RATE);

    const total = this.round(Math.max(0, subtotal + deliveryFee + serviceFee + tax - discount));

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      discount,
      tax,
      total,
      couponCode,
    };
  }

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}

export const pricingService = new PricingService();
