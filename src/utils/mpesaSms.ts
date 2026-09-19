import { MpesaSmsMessage } from '../types';

/**
 * Generate authentic Safaricom M-Pesa receipt code
 * Format: 10 characters starting with two uppercase letters followed by digits and letters
 * e.g. SK92J1K09L, RKD71J9KL2, QK89123041
 */
export function generateMpesaReceiptCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const alphanumeric = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const prefix = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                 letters.charAt(Math.floor(Math.random() * letters.length));
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }
  return code;
}

export interface FormatMpesaParams {
  receiptCode?: string;
  amount: number;
  senderName?: string;
  senderPhone?: string;
  balanceAfter: number;
  dateStr?: string;
  timeStr?: string;
  channel?: 'receive' | 'stk_push' | 'agent' | 'bank' | 'withdraw';
  fee?: number;
}

export interface FormatWithdrawalSmsParams {
  receiptCode?: string;
  amount: number;
  recipientPhone: string;
  recipientName?: string;
  balanceAfter: number;
  fee?: number;
  dateStr?: string;
  timeStr?: string;
  transactionId?: string;
}

/**
 * Formats official Safaricom M-Pesa B2C Withdrawal Confirmation SMS text
 */
export function formatMpesaWithdrawalMessage({
  receiptCode,
  amount,
  recipientPhone,
  recipientName,
  balanceAfter,
  fee = 0,
  dateStr,
  timeStr,
}: FormatWithdrawalSmsParams): string {
  const code = receiptCode || generateMpesaReceiptCode();
  const formattedAmount = `Ksh${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedBalance = `Ksh${balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedFee = `Ksh${fee.toFixed(2)}`;

  const now = new Date();
  const dStr = dateStr || `${now.getDate()}/${now.getMonth() + 1}/${String(now.getFullYear()).slice(-2)}`;
  const tStr = timeStr || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  const target = recipientName 
    ? `${recipientPhone} - ${recipientName.toUpperCase()}`
    : recipientPhone;

  return `${code} Confirmed. ${formattedAmount} sent to ${target} via Safaricom M-Pesa B2C on ${dStr} at ${tStr}. New EchoPay balance is ${formattedBalance}. Transaction cost, ${formattedFee}.`;
}

/**
 * Creates an MpesaSmsMessage for a successful M-Pesa withdrawal/payout
 */
export function createMpesaWithdrawalSms(params: FormatWithdrawalSmsParams): MpesaSmsMessage {
  const receiptCode = params.receiptCode || generateMpesaReceiptCode();
  const now = new Date();
  const timestamp = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const messageText = formatMpesaWithdrawalMessage({
    ...params,
    receiptCode,
  });

  return {
    id: `sms-${receiptCode}-${Date.now()}`,
    receiptCode,
    sender: 'MPESA',
    messageText,
    timestamp,
    amount: params.amount,
    fromNameOrPhone: `M-Pesa Payout: ${params.recipientPhone}`,
    balanceAfter: params.balanceAfter,
    transactionId: params.transactionId || receiptCode,
    isRead: false,
  };
}

/**
 * Formats official Safaricom M-Pesa confirmation SMS text
 */
export function formatMpesaReceiveMessage({
  receiptCode,
  amount,
  senderName,
  senderPhone,
  balanceAfter,
  dateStr,
  timeStr,
  channel = 'receive',
}: FormatMpesaParams): string {
  const code = receiptCode || generateMpesaReceiptCode();
  const formattedAmount = `Ksh${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedBalance = `Ksh${balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const now = new Date();
  const dStr = dateStr || `${now.getDate()}/${now.getMonth() + 1}/${String(now.getFullYear()).slice(-2)}`;
  const tStr = timeStr || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (channel === 'stk_push') {
    return `${code} Confirmed. ${formattedAmount} received from Safaricom M-Pesa via Lipa Na M-Pesa for account EchoPay Wallet on ${dStr} at ${tStr}. New EchoPay balance is ${formattedBalance}. Transaction cost, Ksh0.00.`;
  }

  if (channel === 'bank') {
    return `${code} Confirmed. ${formattedAmount} received from Bank Transfer for account EchoPay Wallet on ${dStr} at ${tStr}. New EchoPay balance is ${formattedBalance}. Transaction cost, Ksh0.00.`;
  }

  const senderDisplay = senderName 
    ? `${senderName.toUpperCase()}${senderPhone ? ` ${senderPhone}` : ''}`
    : (senderPhone || 'M-PESA CUSTOMER');

  return `${code} Confirmed. You have received ${formattedAmount} from ${senderDisplay} on ${dStr} at ${tStr}. New EchoPay M-Pesa balance is ${formattedBalance}. Transaction cost, Ksh0.00.`;
}

/**
 * Creates an MpesaSmsMessage object ready for display and persistent store
 */
export function createMpesaReceiveSms(params: FormatMpesaParams & { transactionId?: string }): MpesaSmsMessage {
  const receiptCode = params.receiptCode || generateMpesaReceiptCode();
  const now = new Date();
  const timestamp = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  const messageText = formatMpesaReceiveMessage({
    ...params,
    receiptCode,
  });

  const fromDisplay = params.channel === 'stk_push' 
    ? 'Lipa Na M-Pesa Online'
    : (params.senderName || params.senderPhone || 'M-Pesa Customer');

  return {
    id: `sms-${receiptCode}-${Date.now()}`,
    receiptCode,
    sender: 'MPESA',
    messageText,
    timestamp,
    amount: params.amount,
    fromNameOrPhone: fromDisplay,
    balanceAfter: params.balanceAfter,
    transactionId: params.transactionId || receiptCode,
    isRead: false,
  };
}

export const INITIAL_MPESA_MESSAGES: MpesaSmsMessage[] = [
  {
    id: 'sms-init-1',
    receiptCode: 'RKD71J9KL2',
    sender: 'MPESA',
    messageText: 'RKD71J9KL2 Confirmed. You have received Ksh8,000.00 from SAMUEL KARIUKI 0720119400 on 12/9/26 at 1:10 PM. New EchoPay M-Pesa balance is Ksh28,645.00. Transaction cost, Ksh0.00.',
    timestamp: '12 Sep, 1:10 PM',
    amount: 8000,
    fromNameOrPhone: 'Samuel Kariuki (+254 720 119 400)',
    balanceAfter: 28645,
    transactionId: 'EL664910NM',
    isRead: true,
  },
  {
    id: 'sms-init-2',
    receiptCode: 'QKA810283K',
    sender: 'MPESA',
    messageText: 'QKA810283K Confirmed. Ksh5,000.00 received from Safaricom M-Pesa via Lipa Na M-Pesa for account EchoPay Wallet on 8/9/26 at 9:15 AM. New EchoPay balance is Ksh20,645.00. Transaction cost, Ksh0.00.',
    timestamp: '8 Sep, 9:15 AM',
    amount: 5000,
    fromNameOrPhone: 'Lipa Na M-Pesa Online',
    balanceAfter: 20645,
    transactionId: 'EL541092ST',
    isRead: true,
  }
];
