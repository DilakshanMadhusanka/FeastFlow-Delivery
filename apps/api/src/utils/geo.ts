export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the Haversine great-circle distance between two geographic coordinates in kilometers.
 */
export function calculateDistanceKm(point1: GeoPoint, point2: GeoPoint): number {
  const EARTH_RADIUS_KM = 6371;

  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_KM * c * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface OperatingHourRecord {
  dayOfWeek: number;
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  isClosed: boolean;
}

/**
 * Determines whether a restaurant is open at a given Date according to its weekly schedule.
 */
export function isRestaurantOpen(
  hours: OperatingHourRecord[],
  targetDate: Date = new Date()
): boolean {
  if (!hours || hours.length === 0) return true;

  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todaySchedule = hours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!todaySchedule || todaySchedule.isClosed) {
    return false;
  }

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  const [openHour, openMin] = todaySchedule.openTime.split(':').map(Number);
  const [closeHour, closeMin] = todaySchedule.closeTime.split(':').map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  if (closeMinutes >= openMinutes) {
    // Standard same-day schedule (e.g., 10:00 to 22:00)
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    // Overnight schedule (e.g., 18:00 to 02:00 next day)
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
}
