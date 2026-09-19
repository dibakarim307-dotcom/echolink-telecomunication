/**
 * Client-side M-Pesa Daraja API helper
 */

export interface MpesaConfigInfo {
  environment: 'sandbox' | 'production';
  shortCode: string;
  b2cShortCode?: string;
  isConfigured: boolean;
  hasPasskey: boolean;
  hasSecurityCredential: boolean;
  initiatorName?: string;
  label: string;
}

export interface B2CResponse {
  success: boolean;
  conversationId?: string;
  originatorConversationId?: string;
  responseDescription?: string;
  responseCode?: string;
  mpesaReceiptNumber?: string;
  mode: 'live_daraja' | 'sandbox_daraja' | 'simulated_daraja';
  error?: string;
}

export interface StkInitiateResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  responseDescription?: string;
  responseCode?: string;
  mode: 'live_daraja' | 'sandbox_daraja' | 'simulated_daraja';
  error?: string;
}

export interface StkStatusResponse {
  checkoutRequestId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
  date?: string;
}

export async function getMpesaConfig(): Promise<MpesaConfigInfo> {
  try {
    const res = await fetch('/api/mpesa/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch M-Pesa config from backend:', err);
  }

  return {
    environment: 'sandbox',
    shortCode: '174379',
    b2cShortCode: '600988',
    isConfigured: true,
    hasPasskey: true,
    hasSecurityCredential: true,
    initiatorName: 'testapi',
    label: 'Safaricom Daraja Sandbox',
  };
}

export async function requestMpesaStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  description?: string;
}): Promise<StkInitiateResponse> {
  const res = await fetch('/api/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `M-Pesa request failed with status ${res.status}`);
  }

  return await res.json();
}

export async function sendMoneyViaB2C(params: {
  phoneNumber: string;
  amount: number;
  remarks?: string;
  occasion?: string;
}): Promise<B2CResponse> {
  const res = await fetch('/api/mpesa/b2c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `M-Pesa B2C failed with status ${res.status}`);
  }

  return await res.json();
}

export async function queryMpesaStatus(checkoutRequestId: string): Promise<StkStatusResponse> {
  const res = await fetch(`/api/mpesa/query/${encodeURIComponent(checkoutRequestId)}`);
  if (!res.ok) {
    throw new Error('Failed to check M-Pesa status');
  }
  return await res.json();
}

export async function simulatePinConfirmation(
  checkoutRequestId: string,
  receiptNumber?: string
): Promise<StkStatusResponse> {
  const res = await fetch(`/api/mpesa/confirm/${encodeURIComponent(checkoutRequestId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiptNumber }),
  });

  if (!res.ok) {
    throw new Error('Failed to confirm transaction');
  }
  return await res.json();
}
