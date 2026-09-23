import { z } from 'zod';
import { AddressTypeEnum } from '@prisma/client';

export const createAddressSchema = z.object({
  title: z.string().trim().min(1, 'Title is required (e.g. Home, Work)').max(50),
  type: z.nativeEnum(AddressTypeEnum).default(AddressTypeEnum.HOME),
  street: z.string().trim().min(3, 'Street address is required').max(150),
  apartment: z.string().trim().max(50).optional(),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().max(50).optional(),
  postalCode: z.string().trim().max(20).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryInstructions: z.string().trim().max(250).optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
