import { z } from 'zod';
import { UserRoleEnum, VehicleTypeEnum } from '@prisma/client';

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must follow E.164 international format (e.g. +15551234567)')
    .optional()
    .or(z.literal('')),
  role: z.nativeEnum(UserRoleEnum).default(UserRoleEnum.CUSTOMER),
  isEmailVerified: z.boolean().default(true),
  isActive: z.boolean().default(true),
  
  // Driver-specific attributes
  vehicleType: z.nativeEnum(VehicleTypeEnum).optional().default(VehicleTypeEnum.MOTORCYCLE),
  licensePlate: z.string().trim().max(30).optional().or(z.literal('')),
  isVerified: z.boolean().optional().default(true),
});

export const queryAdminUsersSchema = z.object({
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type QueryAdminUsersInput = z.infer<typeof queryAdminUsersSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
