/**
 * Safely formats any numeric or string representation of a currency/price amount to 2 decimal places.
 * Handles numbers, numeric strings from Prisma Decimal ("24.50"), null, undefined, and NaN gracefully.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(numeric)) {
    return '0.00';
  }
  return numeric.toFixed(2);
}

/**
 * Safely parses any value into a valid number, defaulting to 0.
 */
export function toNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? 0 : num;
}
