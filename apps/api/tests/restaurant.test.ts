import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, isRestaurantOpen, OperatingHourRecord } from '../src/utils/geo';
import {
  createRestaurantSchema,
  updateOperatingHoursSchema,
  restaurantSearchQuerySchema,
} from '../src/validators/restaurant.validator';

describe('Restaurant Geospatial & Scheduling Utilities', () => {
  it('should calculate accurate Haversine distance between coordinates', () => {
    // Empire State Building (40.7484, -73.9857) to Times Square (40.7580, -73.9855)
    // Distance is roughly ~1.07 km
    const empireState = { latitude: 40.7484, longitude: -73.9857 };
    const timesSquare = { latitude: 40.758, longitude: -73.9855 };

    const distance = calculateDistanceKm(empireState, timesSquare);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.2);
  });

  it('should return 0 km for identical coordinates', () => {
    const coord = { latitude: 40.7484, longitude: -73.9857 };
    const distance = calculateDistanceKm(coord, coord);
    expect(distance).toBe(0);
  });

  it('should accurately detect when a restaurant is open during scheduled hours', () => {
    const mockSchedule: OperatingHourRecord[] = [
      { dayOfWeek: 1, openTime: '09:00', closeTime: '21:00', isClosed: false }, // Monday
      { dayOfWeek: 2, openTime: '09:00', closeTime: '21:00', isClosed: false }, // Tuesday
    ];

    // Monday at 14:30 (2:30 PM) -> Should be open
    const mondayMidday = new Date('2024-06-17T14:30:00'); // 2024-06-17 was Monday
    expect(isRestaurantOpen(mockSchedule, mondayMidday)).toBe(true);

    // Monday at 22:30 (10:30 PM) -> Should be closed
    const mondayLate = new Date('2024-06-17T22:30:00');
    expect(isRestaurantOpen(mockSchedule, mondayLate)).toBe(false);

    // Monday at 07:00 (7:00 AM) -> Should be closed
    const mondayEarly = new Date('2024-06-17T07:00:00');
    expect(isRestaurantOpen(mockSchedule, mondayEarly)).toBe(false);
  });

  it('should detect when a restaurant is closed on scheduled off days', () => {
    const mockSchedule: OperatingHourRecord[] = [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '21:00', isClosed: true }, // Sunday closed
    ];

    const sundayMidday = new Date('2024-06-16T14:00:00'); // 2024-06-16 was Sunday
    expect(isRestaurantOpen(mockSchedule, sundayMidday)).toBe(false);
  });

  it('should correctly handle overnight operating hours', () => {
    // 18:00 to 03:00 next day
    const overnightSchedule: OperatingHourRecord[] = [
      { dayOfWeek: 5, openTime: '18:00', closeTime: '03:00', isClosed: false }, // Friday night
    ];

    // Friday at 23:00 (11 PM) -> Open
    const fridayNight = new Date('2024-06-21T23:00:00');
    expect(isRestaurantOpen(overnightSchedule, fridayNight)).toBe(true);

    // Friday at 01:30 (1:30 AM early morning before 3 AM close) -> Open
    const fridayEarlyMorning = new Date('2024-06-21T01:30:00');
    expect(isRestaurantOpen(overnightSchedule, fridayEarlyMorning)).toBe(true);

    // Friday at 12:00 (Noon) -> Closed
    const fridayNoon = new Date('2024-06-21T12:00:00');
    expect(isRestaurantOpen(overnightSchedule, fridayNoon)).toBe(false);
  });
});

describe('Restaurant Validation Schemas', () => {
  it('should accept valid restaurant creation input', () => {
    const validRestaurant = {
      name: 'Artisan Burger Co',
      description: 'Gourmet burgers and fries',
      phone: '+15551234567',
      street: '123 Main St',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.006,
      deliveryRadiusKm: 8.5,
      deliveryFeeBase: 3.5,
      estimatedDeliveryMin: 20,
      estimatedDeliveryMax: 40,
    };

    const result = createRestaurantSchema.safeParse(validRestaurant);
    expect(result.success).toBe(true);
  });

  it('should reject restaurant creation with invalid phone number', () => {
    const invalidRestaurant = {
      name: 'Artisan Burger Co',
      phone: 'not-a-phone',
      street: '123 Main St',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    const result = createRestaurantSchema.safeParse(invalidRestaurant);
    expect(result.success).toBe(false);
  });

  it('should require 7 days when updating operating hours', () => {
    const only3Days = {
      hours: [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '21:00', isClosed: false },
        { dayOfWeek: 1, openTime: '09:00', closeTime: '21:00', isClosed: false },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '21:00', isClosed: false },
      ],
    };

    const result = updateOperatingHoursSchema.safeParse(only3Days);
    expect(result.success).toBe(false);
  });

  it('should parse and coerce search query parameters correctly', () => {
    const rawQueryParams = {
      query: 'burger',
      latitude: '40.7484',
      longitude: '-73.9857',
      minRating: '4.5',
      isOpen: 'true',
      page: '2',
      limit: '15',
    };

    const parsed = restaurantSearchQuerySchema.parse(rawQueryParams);
    expect(parsed.query).toBe('burger');
    expect(parsed.latitude).toBe(40.7484);
    expect(parsed.longitude).toBe(-73.9857);
    expect(parsed.minRating).toBe(4.5);
    expect(parsed.isOpen).toBe(true);
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
  });
});
