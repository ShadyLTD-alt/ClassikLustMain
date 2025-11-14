/**
 * 🔧 Safe Date Handling Utilities
 * Prevents toISOString errors by validating dates before conversion
 * Ensures all date operations are type-safe and error-free
 */

import logger from '../logger';

/**
 * Safely converts any value to ISO string format
 * Returns null if conversion fails
 */
export function safeToISOString(value: any): string | null {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) {
    // Check if it's a valid date
    if (isNaN(value.getTime())) {
      logger.warn('⚠️  Invalid Date object, returning null');
      return null;
    }
    return value.toISOString();
  }
  
  // String date
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        logger.warn(`⚠️  Invalid date string: "${value}"`);
        return null;
      }
      return date.toISOString();
    } catch (err) {
      logger.warn(`⚠️  Failed to convert date string: "${value}"`, err);
      return null;
    }
  }
  
  // Number (timestamp)
  if (typeof value === 'number') {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        logger.warn(`⚠️  Invalid timestamp: ${value}`);
        return null;
      }
      return date.toISOString();
    } catch (err) {
      logger.warn(`⚠️  Failed to convert timestamp: ${value}`, err);
      return null;
    }
  }
  
  logger.warn(`⚠️  Unsupported date type: ${typeof value}`, value);
  return null;
}

/**
 * Ensures a value is a valid Date object
 * Returns current date if conversion fails
 */
export function ensureDate(value: any): Date {
  if (!value) return new Date();
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }
  
  return new Date();
}

/**
 * Checks if a value is a valid date
 */
export function isValidDate(value: any): boolean {
  if (!value) return false;
  
  const date = value instanceof Date ? value : new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Sanitizes an object's date fields
 * Converts all date-like fields to proper Date objects
 */
export function sanitizeDateFields(obj: any, dateFields: string[] = []): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  // Default date field names to check
  const defaultDateFields = [
    'createdAt', 'updatedAt', 'lastLogin', 'lastEnergyUpdate',
    'lastWeeklyReset', 'lastDailyReset', 'boostExpiresAt', 'boostEndTime',
    'lastActiveAt', 'unlockedAt', 'expiresAt', 'lastModified'
  ];
  
  const fieldsToCheck = [...defaultDateFields, ...dateFields];
  
  fieldsToCheck.forEach(field => {
    if (field in sanitized && sanitized[field] !== null && sanitized[field] !== undefined) {
      sanitized[field] = ensureDate(sanitized[field]);
    }
  });
  
  return sanitized;
}

/**
 * Formats a date to ISO string safely
 * Returns a default value if conversion fails
 */
export function formatDateSafe(value: any, defaultValue: string = new Date().toISOString()): string {
  const isoString = safeToISOString(value);
  return isoString || defaultValue;
}

/**
 * Parses a date from various formats safely
 * Returns null if parsing fails
 */
export function parseDateSafe(value: any): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

logger.info('✅ [DATE HELPER] Safe date utilities loaded');

export default {
  safeToISOString,
  ensureDate,
  isValidDate,
  sanitizeDateFields,
  formatDateSafe,
  parseDateSafe
};