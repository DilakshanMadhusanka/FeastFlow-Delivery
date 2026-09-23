import { z } from 'zod';
import { VehicleTypeEnum } from '@prisma/client';

export const toggleDriverStatusSchema = z.object({
  isOnline: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  bearing: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

export const driverStepSchema = z.object({
  step: z.enum([
    'HEADING_TO_RESTAURANT',
    'ARRIVED_AT_RESTAURANT',
    'PICKED_UP',
    'HEADING_TO_CUSTOMER',
    'ARRIVED_AT_CUSTOMER',
    'DELIVERED',
  ]),
  notes: z.string().trim().max(300).optional(),
});

export const registerDriverSchema = z.object({
  vehicleType: z.nativeEnum(VehicleTypeEnum).default(VehicleTypeEnum.MOTORCYCLE),
  licensePlate: z.string().trim().max(20).optional(),
});

export type ToggleDriverStatusInput = z.infer<typeof toggleDriverStatusSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type DriverStepInput = z.infer<typeof driverStepSchema>;
export type RegisterDriverInput = z.infer<typeof registerDriverSchema>;
