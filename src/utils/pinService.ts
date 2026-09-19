/**
 * EchoPay PIN Security & Storage Service
 */

const PIN_STORAGE_KEY = 'echopay_user_pin';
const DEFAULT_PIN = '1234';

export function getStoredPin(): string {
  if (typeof window === 'undefined') return DEFAULT_PIN;
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (stored && /^\d{4}$/.test(stored)) {
      return stored;
    }
  } catch {
    // Local storage access error fallback
  }
  return DEFAULT_PIN;
}

export function saveStoredPin(newPin: string): boolean {
  if (!/^\d{4}$/.test(newPin)) {
    return false;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, newPin);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function verifyStoredPin(inputPin: string): boolean {
  return inputPin === getStoredPin();
}
