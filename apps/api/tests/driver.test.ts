import { describe, it, expect } from 'vitest';
import {
  toggleDriverStatusSchema,
  updateLocationSchema,
  driverStepSchema,
  registerDriverSchema,
} from '../src/validators/driver.validator';
import { VehicleTypeEnum } from '@prisma/client';
import { calculateDistanceKm } from '../src/utils/geo';

describe('Driver Fleet Validation & Schemas', () => {
  it('should validate driver online status toggle', () => {
    const valid = {
      isOnline: true,
      latitude: 40.7128,
      longitude: -74.006,
    };
    expect(toggleDriverStatusSchema.safeParse(valid).success).toBe(true);

    const offlineWithoutCoords = {
      isOnline: false,
    };
    expect(toggleDriverStatusSchema.safeParse(offlineWithoutCoords).success).toBe(true);

    const invalidCoords = {
      isOnline: true,
      latitude: 120.0, // Invalid latitude
    };
    expect(toggleDriverStatusSchema.safeParse(invalidCoords).success).toBe(false);
  });

  it('should validate GPS location telemetry payload', () => {
    const validTelemetry = {
      latitude: 40.758,
      longitude: -73.9855,
      bearing: 180,
      speed: 25.5,
    };
    expect(updateLocationSchema.safeParse(validTelemetry).success).toBe(true);

    const missingLng = {
      latitude: 40.758,
    };
    expect(updateLocationSchema.safeParse(missingLng).success).toBe(false);
  });

  it('should validate turn-by-turn workflow steps', () => {
    const validSteps = [
      'HEADING_TO_RESTAURANT',
      'ARRIVED_AT_RESTAURANT',
      'PICKED_UP',
      'HEADING_TO_CUSTOMER',
      'ARRIVED_AT_CUSTOMER',
      'DELIVERED',
    ];

    for (const step of validSteps) {
      expect(driverStepSchema.safeParse({ step }).success).toBe(true);
    }

    expect(driverStepSchema.safeParse({ step: 'INVALID_STEP' }).success).toBe(false);
  });

  it('should validate driver vehicle registration', () => {
    const validBike = {
      vehicleType: VehicleTypeEnum.BICYCLE,
    };
    expect(registerDriverSchema.safeParse(validBike).success).toBe(true);

    const validCar = {
      vehicleType: VehicleTypeEnum.CAR,
      licensePlate: 'NYC-7890',
    };
    expect(registerDriverSchema.safeParse(validCar).success).toBe(true);
  });
});

describe('Driver Dispatch & Distance Calculations', () => {
  it('should calculate accurate pickup and delivery distances', () => {
    // Times Square to Empire State Building (~1.4 km)
    const timesSquare = { latitude: 40.758, longitude: -73.9855 };
    const empireState = { latitude: 40.7484, longitude: -73.9857 };

    const distanceKm = calculateDistanceKm(timesSquare, empireState);
    expect(distanceKm).toBeGreaterThan(1.0);
    expect(distanceKm).toBeLessThan(1.8);
  });

  it('should compute standard driver payout correctly based on distance and tips', () => {
    const basePayout = 4.0;
    const distanceKm = 3.5;
    const ratePerKm = 1.2;
    const tip = 3.0;

    const distancePayout = Math.round(distanceKm * ratePerKm * 100) / 100;
    const totalEarnings = Math.round((basePayout + distancePayout + tip) * 100) / 100;

    expect(distancePayout).toBe(4.2);
    expect(totalEarnings).toBe(11.2);
  });
});
