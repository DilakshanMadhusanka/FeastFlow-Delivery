import { z } from 'zod';
import { OptionSelectionTypeEnum } from '@prisma/client';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(50),
  iconUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  restaurantId: z.string().uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createFoodAddonSchema = z.object({
  name: z.string().trim().min(1, 'Addon name is required').max(50),
  price: z.number().nonnegative('Addon price must be non-negative').default(0.0),
  isAvailable: z.boolean().default(true),
  optionId: z.string().uuid().optional(),
});

export const createFoodItemOptionSchema = z.object({
  name: z.string().trim().min(1, 'Option group name is required').max(50),
  type: z.nativeEnum(OptionSelectionTypeEnum).default(OptionSelectionTypeEnum.SINGLE),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  addons: z.array(createFoodAddonSchema).optional(),
});

export const createFoodItemSchema = z.object({
  restaurantId: z.string().uuid('Valid restaurant UUID is required'),
  categoryId: z.string().uuid('Valid category UUID is required'),
  name: z.string().trim().min(2, 'Food item name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().positive('Price must be greater than 0'),
  ingredients: z.array(z.string().trim()).default([]),
  isAvailable: z.boolean().default(true),
  preparationTimeMin: z.number().int().min(1).max(120).default(15),
  calories: z.number().int().positive().optional(),
  options: z.array(createFoodItemOptionSchema).optional(),
  standaloneAddons: z.array(createFoodAddonSchema).optional(),
});

export const updateFoodItemSchema = createFoodItemSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const foodSearchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query must be at least 1 character'),
  restaurantId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateFoodAddonInput = z.infer<typeof createFoodAddonSchema>;
export type CreateFoodItemOptionInput = z.infer<typeof createFoodItemOptionSchema>;
export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
export type UpdateFoodItemInput = z.infer<typeof updateFoodItemSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type FoodSearchQueryParams = z.infer<typeof foodSearchQuerySchema>;
