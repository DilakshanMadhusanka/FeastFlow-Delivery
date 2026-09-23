import { describe, it, expect } from 'vitest';
import { pricingService } from '../src/services/pricing.service';
import { addToCartSchema, updateCartItemSchema } from '../src/validators/cart.validator';
import { Coupon, CouponDiscountTypeEnum } from '@prisma/client';

describe('Cart Pricing Engine', () => {
  it('should return zeroes for an empty cart', () => {
    const result = pricingService.calculateCart({
      items: [],
      deliveryFeeBase: 3.5,
    });

    expect(result.subtotal).toBe(0);
    expect(result.deliveryFee).toBe(0);
    expect(result.serviceFee).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should accurately calculate subtotal for items with add-ons', () => {
    // 2x Chicken Burger ($8.99 + $1.50 Cheese = $10.49 * 2 = $20.98)
    // 1x Herb Fries ($4.00)
    // Expected subtotal = $24.98
    const result = pricingService.calculateCart({
      items: [
        {
          basePrice: 8.99,
          addons: [{ price: 1.5 }],
          quantity: 2,
        },
        {
          basePrice: 4.0,
          addons: [],
          quantity: 1,
        },
      ],
      deliveryFeeBase: 2.99,
    });

    expect(result.subtotal).toBe(24.98);
    expect(result.deliveryFee).toBe(2.99);
    // Service fee: 5% of 24.98 is $1.25 -> Minimum $1.50 kicks in!
    expect(result.serviceFee).toBe(1.5);
    // Tax: 8.875% of 24.98 = $2.22
    expect(result.tax).toBe(2.22);
    // Total = 24.98 + 2.99 + 1.50 + 2.22 = 31.69
    expect(result.total).toBe(31.69);
  });

  it('should apply 20% coupon with maximum discount cap', () => {
    const mockPercentageCoupon: Coupon = {
      id: 'cpn-1',
      code: 'WELCOME20',
      description: '20% off',
      discountType: CouponDiscountTypeEnum.PERCENTAGE,
      discountValue: new (require('@prisma/client').Prisma.Decimal)(20),
      minimumAmount: new (require('@prisma/client').Prisma.Decimal)(15),
      maxDiscount: new (require('@prisma/client').Prisma.Decimal)(5.0), // Cap at $5.00
      usageLimit: 100,
      perUserLimit: 1,
      usedCount: 0,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2028-12-31'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Subtotal $50.00 -> 20% would be $10.00, but cap is $5.00!
    const result = pricingService.calculateCart({
      items: [
        {
          basePrice: 50.0,
          addons: [],
          quantity: 1,
        },
      ],
      deliveryFeeBase: 3.0,
      coupon: mockPercentageCoupon,
    });

    expect(result.subtotal).toBe(50.0);
    expect(result.discount).toBe(5.0); // Capped at $5.00
    expect(result.couponCode).toBe('WELCOME20');
  });

  it('should reject coupon if subtotal does not meet minimum order requirement', () => {
    const mockMinOrderCoupon: Coupon = {
      id: 'cpn-2',
      code: 'FEAST10',
      description: '$10 off orders over $40',
      discountType: CouponDiscountTypeEnum.FIXED,
      discountValue: new (require('@prisma/client').Prisma.Decimal)(10),
      minimumAmount: new (require('@prisma/client').Prisma.Decimal)(40),
      maxDiscount: null,
      usageLimit: 100,
      perUserLimit: 1,
      usedCount: 0,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2028-12-31'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Subtotal only $20.00 -> minimum $40 requirement not met!
    const result = pricingService.calculateCart({
      items: [
        {
          basePrice: 20.0,
          addons: [],
          quantity: 1,
        },
      ],
      deliveryFeeBase: 2.5,
      coupon: mockMinOrderCoupon,
    });

    expect(result.subtotal).toBe(20.0);
    expect(result.discount).toBe(0); // No discount applied!
    expect(result.couponCode).toBeUndefined();
  });
});

describe('Cart Validation Schemas', () => {
  it('should accept valid add-to-cart payload', () => {
    const valid = {
      foodItemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantity: 2,
      addonIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
      specialInstructions: 'No onions please',
    };
    expect(addToCartSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject add-to-cart with non-positive quantity', () => {
    const invalid = {
      foodItemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantity: 0,
    };
    expect(addToCartSchema.safeParse(invalid).success).toBe(false);
  });

  it('should accept update-cart-item with quantity 0 for removal', () => {
    const valid = {
      quantity: 0,
    };
    expect(updateCartItemSchema.safeParse(valid).success).toBe(true);
  });
});
