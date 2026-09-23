import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  createFoodItemSchema,
  createFoodItemOptionSchema,
  createFoodAddonSchema,
  foodSearchQuerySchema,
} from '../src/validators/menu.validator';
import { OptionSelectionTypeEnum } from '@prisma/client';

describe('Menu & Food Item Validation Schemas', () => {
  it('should accept valid food item with options and add-ons', () => {
    const validItem = {
      restaurantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      categoryId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'Smokehouse BBQ Bacon Burger',
      description: 'Double Angus beef patties, hickory smoked bacon, crispy onion tanglers, tangy BBQ sauce.',
      price: 15.99,
      ingredients: ['Angus Beef', 'Bacon', 'Onion Rings', 'BBQ Sauce', 'Brioche Bun'],
      preparationTimeMin: 15,
      calories: 850,
      options: [
        {
          name: 'Bun Selection',
          type: OptionSelectionTypeEnum.SINGLE,
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          addons: [
            { name: 'Toasted Brioche Bun', price: 0.0, isAvailable: true },
            { name: 'Gluten-Free Artisan Bun', price: 1.5, isAvailable: true },
          ],
        },
      ],
      standaloneAddons: [
        { name: 'Extra Cheddar Cheese Slice', price: 1.25, isAvailable: true },
        { name: 'Side of Truffle Aioli Dip', price: 1.0, isAvailable: true },
      ],
    };

    const result = createFoodItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAvailable).toBe(true);
      expect(result.data.preparationTimeMin).toBe(15);
    }
  });

  it('should reject food item with negative price or invalid UUID', () => {
    const invalidPrice = {
      restaurantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      categoryId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'Free Burger',
      price: -5.0, // Invalid negative price
    };
    expect(createFoodItemSchema.safeParse(invalidPrice).success).toBe(false);

    const invalidUuid = {
      restaurantId: 'not-a-valid-uuid',
      categoryId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'Valid Burger',
      price: 12.0,
    };
    expect(createFoodItemSchema.safeParse(invalidUuid).success).toBe(false);
  });

  it('should validate food add-on pricing rules', () => {
    const validAddon = {
      name: 'Extra Crispy Bacon',
      price: 2.5,
      isAvailable: true,
    };
    expect(createFoodAddonSchema.safeParse(validAddon).success).toBe(true);

    const negativeAddon = {
      name: 'Discount Addon',
      price: -1.0,
    };
    expect(createFoodAddonSchema.safeParse(negativeAddon).success).toBe(false);
  });

  it('should validate option groups configuration', () => {
    const validOption = {
      name: 'Cheese Type',
      type: OptionSelectionTypeEnum.SINGLE,
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
    };
    expect(createFoodItemOptionSchema.safeParse(validOption).success).toBe(true);
  });

  it('should validate and coerce food search query parameters', () => {
    const rawSearch = {
      query: 'truffle',
      minPrice: '10',
      maxPrice: '25.50',
      page: '1',
      limit: '10',
    };

    const parsed = foodSearchQuerySchema.parse(rawSearch);
    expect(parsed.query).toBe('truffle');
    expect(parsed.minPrice).toBe(10);
    expect(parsed.maxPrice).toBe(25.5);
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it('should validate category creation schema', () => {
    const validCat = {
      name: 'Authentic Pasta & Risotto',
      sortOrder: 3,
    };
    expect(createCategorySchema.safeParse(validCat).success).toBe(true);

    const shortCat = {
      name: 'A', // too short
    };
    expect(createCategorySchema.safeParse(shortCat).success).toBe(false);
  });
});
