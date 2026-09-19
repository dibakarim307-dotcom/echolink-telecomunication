/**
 * Echo Link Mobile Money Fee Engine
 * Strictly follows pricing rule:
 * - Transaction fee is 2% less than Safaricom / standard market tariff
 * - Micro-transactions under 150 KSh are 100% Free (0% fee)
 */

export function calculateEchoFee(amount: number): number {
  if (isNaN(amount) || amount <= 0) return 0;
  
  if (amount < 150) {
    // Under 150 KSh is completely free
    return 0;
  }
  
  // 2% less than Safaricom / standard market tariff
  const standardFee = getStandardTariff(amount);
  const fee = standardFee * 0.98;
  return Math.round(fee * 100) / 100;
}

/**
 * Calculate withdrawal fee (at Agent, ATM, or M-Pesa B2C)
 * Micro-withdrawals under 150 KSh are 100% Free (0% fee).
 * Amounts 150 KSh and above are 2% lower than standard Safaricom Agent withdrawal tariffs.
 */
export function calculateWithdrawFee(amount: number): number {
  if (isNaN(amount) || amount <= 0) return 0;
  if (amount < 150) return 0;

  let standardWithdrawFee = 11;
  if (amount <= 500) standardWithdrawFee = 11;
  else if (amount <= 1000) standardWithdrawFee = 29;
  else if (amount <= 1500) standardWithdrawFee = 30;
  else if (amount <= 2500) standardWithdrawFee = 31;
  else if (amount <= 3500) standardWithdrawFee = 52;
  else if (amount <= 5000) standardWithdrawFee = 69;
  else if (amount <= 7500) standardWithdrawFee = 87;
  else if (amount <= 10000) standardWithdrawFee = 115;
  else if (amount <= 15000) standardWithdrawFee = 167;
  else if (amount <= 20000) standardWithdrawFee = 185;
  else standardWithdrawFee = 200;

  // 2% lower than standard market withdrawal rate
  return Math.round(standardWithdrawFee * 0.98 * 100) / 100;
}

/**
 * Standard Industry P2P Tariff lookup for comparison
 */
export function getStandardTariff(amount: number): number {
  if (amount <= 100) return 0;
  if (amount <= 500) return 7;
  if (amount <= 1000) return 13;
  if (amount <= 1500) return 23;
  if (amount <= 2500) return 34;
  if (amount <= 3500) return 53;
  if (amount <= 5000) return 57;
  if (amount <= 7500) return 78;
  if (amount <= 10000) return 90;
  if (amount <= 20000) return 108;
  return 108;
}

/**
 * Compare Echo Link vs Standard Market Tariffs
 */
export function getFeeComparison(amount: number): {
  echoFee: number;
  standardFee: number;
  difference: number;
  isEchoCheaper: boolean;
  savingsPercent: number;
} {
  const echoFee = calculateEchoFee(amount);
  const standardFee = getStandardTariff(amount);
  const difference = Math.round((standardFee - echoFee) * 100) / 100;
  const isEchoCheaper = echoFee < standardFee;
  const savingsPercent = standardFee > 0 ? Math.round(((standardFee - echoFee) / standardFee) * 100) : 0;

  return {
    echoFee,
    standardFee,
    difference,
    isEchoCheaper,
    savingsPercent,
  };
}

/**
 * Generate authentic EchoLink transaction code
 * Format: EL followed by random letters and numbers (e.g. EL849301KA)
 */
export function generateTransactionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'EL';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format Kenyan phone number
 */
export function formatKenyanPhone(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return '+254 ' + clean.slice(1, 4) + ' ' + clean.slice(4, 7) + ' ' + clean.slice(7);
  }
  if (clean.startsWith('254')) {
    return '+254 ' + clean.slice(3, 6) + ' ' + clean.slice(6, 9) + ' ' + clean.slice(9);
  }
  if (clean.startsWith('+254')) {
    return '+254 ' + clean.slice(4, 7) + ' ' + clean.slice(7, 10) + ' ' + clean.slice(10);
  }
  return phone;
}
