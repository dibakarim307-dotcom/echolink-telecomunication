export type CallType = 'voice' | 'video';
export type CallStatus = 'dialing' | 'ringing' | 'connected' | 'ended' | 'incoming';
export type CallDirection = 'outgoing' | 'incoming' | 'missed';

export interface CallRecord {
  id: string;
  name: string;
  phoneNumber: string;
  type: CallType;
  direction: CallDirection;
  timestamp: string;
  durationSeconds: number;
  avatar?: string;
  costKsh: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  avatar: string;
  favorite?: boolean;
  status?: string;
  verifiedEchoUser?: boolean;
}

export type TransactionType = 'send' | 'receive' | 'paybill' | 'till' | 'airtime' | 'withdraw' | 'fuliza';

export interface Transaction {
  id: string; // e.g. EL849301KA
  type: TransactionType;
  recipientName: string;
  recipientPhoneOrAccount: string;
  amount: number;
  fee: number;
  totalDebited: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'reversed';
  balanceAfter: number;
  note?: string;
  reference?: string;
}

export interface MpesaSmsMessage {
  id: string;
  receiptCode: string;
  sender: string; // e.g. 'MPESA'
  messageText: string;
  timestamp: string;
  amount: number;
  fromNameOrPhone: string;
  balanceAfter: number;
  transactionId: string;
  isRead?: boolean;
}

export interface PayBillOption {
  id: string;
  businessNumber: string;
  name: string;
  category: 'Utilities' | 'Internet' | 'Government' | 'Education' | 'Entertainment';
  accountPlaceholder: string;
  defaultAccount?: string;
  logoEmoji: string;
}

export interface DataBundle {
  id: string;
  name: string;
  volume: string;
  validity: string;
  priceKsh: number;
  bonus: string;
  category: 'daily' | 'weekly' | 'monthly' | 'unlimited';
}

export interface USSDMenu {
  code: string;
  title: string;
  prompt: string;
  options?: { key: string; label: string; nextAction?: string; responseMessage?: string }[];
  isTerminal?: boolean;
  message?: string;
}
