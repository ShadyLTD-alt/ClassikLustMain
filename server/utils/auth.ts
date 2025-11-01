import crypto from 'crypto';

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getSessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return expiry;
}
