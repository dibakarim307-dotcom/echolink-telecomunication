import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Phone, 
  PhoneOff,
  Radio,
  Video, 
  Wallet, 
  Users, 
  Hash, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  PlusCircle, 
  ChevronRight,
  Send,
  Zap,
  Activity,
  Award,
  ArrowDownLeft,
  MessageSquare
} from 'lucide-react';

import { Contact, CallRecord, Transaction, DataBundle, MpesaSmsMessage } from './types';
import { INITIAL_CONTACTS, INITIAL_CALL_HISTORY, INITIAL_TRANSACTIONS } from './data/mockData';
import { calculateEchoFee, generateTransactionId } from './utils/feeCalculator';
import { playMoneySentChime, playMpesaNotificationSound, startIncomingRingtone, stopIncomingRingtone } from './utils/audio';
import { sendMoneyViaB2C } from './utils/mpesaClient';
import { INITIAL_MPESA_MESSAGES, createMpesaReceiveSms, generateMpesaReceiptCode } from './utils/mpesaSms';

import { NetworkHeader } from './components/NetworkHeader';
import { DialerTab } from './components/DialerTab';
import { EchoPayTab } from './components/EchoPayTab';
import { CallModal } from './components/CallModal';
import { VideoCallModal } from './components/VideoCallModal';
import { PinModal } from './components/PinModal';
import { ChangePinModal } from './components/ChangePinModal';
import { ReceiptModal } from './components/ReceiptModal';
import { USSDModal } from './components/USSDModal';
import { ContactsModal } from './components/ContactsModal';
import { AddMoneyModal } from './components/AddMoneyModal';
import { WithdrawModal } from './components/WithdrawModal';
import { MpesaNotificationModal } from './components/MpesaNotificationModal';
import { MpesaPushBanner } from './components/MpesaPushBanner';
import { MpesaInboxModal } from './components/MpesaInboxModal';
import { ReceiveMoneyModal } from './components/ReceiveMoneyModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Global App States
  const [balance, setBalance] = useState<number>(24850.00);
  const [airtime, setAirtime] = useState<number>(340.00);
  const [dataGb, setDataGb] = useState<number>(18.4);
  const [voiceMins, setVoiceMins] = useState<number>(120);

  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [callHistory, setCallHistory] = useState<CallRecord[]>(INITIAL_CALL_HISTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Navigation: 'echopay' or 'dialer'
  const [activeTab, setActiveTab] = useState<'echopay' | 'dialer'>('echopay');

  // Modals state
  const [activeCall, setActiveCall] = useState<{
    name: string;
    phone: string;
    type: 'voice' | 'video';
    avatar?: string;
  } | null>(null);

  const [pendingTransfer, setPendingTransfer] = useState<{
    recipientName: string;
    recipientAccount: string;
    amount: number;
    type: Transaction['type'];
    note?: string;
    fee: number;
    total: number;
  } | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [ussdCode, setUssdCode] = useState<string | null>(null);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [showAddMoney, setShowAddMoney] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [showMpesaInbox, setShowMpesaInbox] = useState<boolean>(false);
  
  // M-Pesa SMS Confirmation Messages
  const [mpesaMessages, setMpesaMessages] = useState<MpesaSmsMessage[]>(() => {
    try {
      const saved = localStorage.getItem('echolink_mpesa_sms');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved M-Pesa SMS', e);
    }
    return INITIAL_MPESA_MESSAGES;
  });

  const [activeMpesaSms, setActiveMpesaSms] = useState<MpesaSmsMessage | null>(null);
  const [pushBannerSms, setPushBannerSms] = useState<MpesaSmsMessage | null>(null);

  // Persist M-Pesa SMS to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('echolink_mpesa_sms', JSON.stringify(mpesaMessages));
    } catch (e) {
      console.error('Failed to save M-Pesa SMS', e);
    }
  }, [mpesaMessages]);

  // Auto-dismiss top push banner after 9 seconds
  useEffect(() => {
    if (!pushBannerSms) return;
    const timer = setTimeout(() => {
      setPushBannerSms(null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [pushBannerSms]);

  const [changePinConfig, setChangePinConfig] = useState<{ open: boolean; mode: 'verify' | 'otp_reset' }>({
    open: false,
    mode: 'verify',
  });

  const openChangePin = (mode: 'verify' | 'otp_reset' = 'verify') => {
    setChangePinConfig({ open: true, mode });
  };
  const closeChangePin = () => {
    setChangePinConfig({ open: false, mode: 'verify' });
  };

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Incoming Call Simulation State
  const [incomingCall, setIncomingCall] = useState<{
    name: string;
    phone: string;
    type: 'voice' | 'video';
    avatar?: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Trigger call
  const handleStartCall = (name: string, phone: string, type: 'voice' | 'video') => {
    const contact = contacts.find(c => c.phoneNumber.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    setActiveCall({
      name,
      phone,
      type,
      avatar: contact?.avatar,
    });
  };

  // Simulate incoming call from network
  const handleSimulateIncomingCall = (
    callerName = "Sarah Chebet", 
    phone = "+254 712 345 678", 
    type: 'voice' | 'video' = 'voice'
  ) => {
    const contact = contacts.find(c => c.phoneNumber.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    setIncomingCall({
      name: callerName,
      phone,
      type,
      avatar: contact?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    });
    startIncomingRingtone();
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    stopIncomingRingtone();
    setActiveCall({
      name: incomingCall.name,
      phone: incomingCall.phone,
      type: incomingCall.type,
      avatar: incomingCall.avatar,
    });
    setIncomingCall(null);
  };

  const handleDeclineIncomingCall = () => {
    if (incomingCall) {
      stopIncomingRingtone();
      const newRecord: CallRecord = {
        id: `call-${Date.now()}`,
        name: incomingCall.name,
        phoneNumber: incomingCall.phone,
        type: incomingCall.type,
        direction: 'missed',
        timestamp: 'Just now',
        durationSeconds: 0,
        avatar: incomingCall.avatar,
        costKsh: 0,
      };
      setCallHistory(prev => [newRecord, ...prev]);
      showToast(`Missed call from ${incomingCall.name}`);
    }
    setIncomingCall(null);
  };

  // Call ended handler
  const handleEndCall = (durationSec: number) => {
    if (activeCall) {
      const newRecord: CallRecord = {
        id: `call-${Date.now()}`,
        name: activeCall.name,
        phoneNumber: activeCall.phone,
        type: activeCall.type,
        direction: 'outgoing',
        timestamp: 'Just now',
        durationSeconds: durationSec,
        avatar: activeCall.avatar,
        costKsh: 0, // Echo-to-Echo VoLTE is zero rate
      };
      setCallHistory(prev => [newRecord, ...prev]);
    }
    setActiveCall(null);
  };

  // Prepare a transfer
  const handleInitiateTransfer = (
    recipientName: string,
    recipientAccount: string,
    amount: number,
    type: Transaction['type'],
    note?: string
  ) => {
    const fee = calculateEchoFee(amount);
    const total = amount + fee;

    setPendingTransfer({
      recipientName,
      recipientAccount,
      amount,
      type,
      note,
      fee,
      total,
    });
  };

  // Confirm PIN & Execute Transfer
  const handleConfirmTransfer = () => {
    if (!pendingTransfer) return;

    const newBalance = Math.round((balance - pendingTransfer.total) * 100) / 100;
    setBalance(newBalance);

    const now = new Date();
    const formattedDate = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newTx: Transaction = {
      id: generateTransactionId(),
      type: pendingTransfer.type,
      recipientName: pendingTransfer.recipientName,
      recipientPhoneOrAccount: pendingTransfer.recipientAccount,
      amount: pendingTransfer.amount,
      fee: pendingTransfer.fee,
      totalDebited: pendingTransfer.total,
      timestamp: formattedDate,
      status: 'completed',
      balanceAfter: newBalance,
      note: pendingTransfer.note,
    };

    setTransactions(prev => [newTx, ...prev]);
    setPendingTransfer(null);

    // If sending money to a mobile phone number, initiate Safaricom M-Pesa B2C payout
    if (pendingTransfer.type === 'send' && pendingTransfer.recipientAccount) {
      sendMoneyViaB2C({
        phoneNumber: pendingTransfer.recipientAccount,
        amount: pendingTransfer.amount,
        remarks: pendingTransfer.note || 'EchoPay Transfer',
        occasion: 'EchoPay',
      }).then(res => {
        if (res?.mpesaReceiptNumber) {
          setTransactions(prev => prev.map(t => t.id === newTx.id ? {
            ...t,
            note: `${t.note || 'EchoPay Transfer'} • M-Pesa B2C Ref: ${res.mpesaReceiptNumber}`,
          } : t));
        }
      }).catch(err => {
        console.warn('M-Pesa B2C payout note:', err);
      });
    }

    // Audio and visual celebration
    playMoneySentChime();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#14b8a6', '#6366f1'],
    });

    // Open receipt
    setSelectedReceipt(newTx);
  };

  // Quick in-call send money
  const handleInCallQuickSend = (recipientName: string, recipientPhone: string) => {
    handleInitiateTransfer(
      recipientName,
      recipientPhone,
      200, // sample quick amount
      'send',
      'In-Call Instant Transfer'
    );
  };

  // Buy 5G Bundle
  const handleBuyBundle = (bundle: DataBundle) => {
    if (balance < bundle.priceKsh) {
      showToast('Insufficient EchoPay balance to purchase bundle.');
      return;
    }

    const newBalance = balance - bundle.priceKsh;
    setBalance(newBalance);

    // Parse data volume and add
    const gbMatch = bundle.volume.match(/(\d+(\.\d+)?)\s*GB/i);
    if (gbMatch) {
      setDataGb(prev => Math.round((prev + parseFloat(gbMatch[1])) * 10) / 10);
    }

    const newTx: Transaction = {
      id: generateTransactionId(),
      type: 'airtime',
      recipientName: `EchoLink 5G (${bundle.name})`,
      recipientPhoneOrAccount: 'Self (+254 779 123 456)',
      amount: bundle.priceKsh,
      fee: 0, // 0 fee on airtime/data
      totalDebited: bundle.priceKsh,
      timestamp: 'Just now',
      status: 'completed',
      balanceAfter: newBalance,
      note: `${bundle.volume} valid for ${bundle.validity} activated`,
    };

    setTransactions(prev => [newTx, ...prev]);
    playMoneySentChime();
    showToast(`Success! ${bundle.volume} 5G bundle activated.`);
  };

  // Add money / topup
  const handleAddMoney = (amount: number, source: string, receiptId?: string) => {
    const newBal = balance + amount;
    setBalance(newBal);

    const txId = receiptId || generateMpesaReceiptCode();
    const isMpesa = source.includes('M-Pesa');
    const newTx: Transaction = {
      id: txId,
      type: 'receive',
      recipientName: isMpesa ? 'M-Pesa Deposit (Daraja STK)' : 'Top-Up via ' + source,
      recipientPhoneOrAccount: 'EchoPay Wallet',
      amount: amount,
      fee: 0,
      totalDebited: amount,
      timestamp: 'Just now',
      status: 'completed',
      balanceAfter: newBal,
      note: isMpesa 
        ? `Lipa Na M-Pesa STK Push • Receipt: ${txId} (Zero Fee)` 
        : `Deposit from ${source} (Zero Fee)`,
    };

    setTransactions(prev => [newTx, ...prev]);

    if (isMpesa) {
      const sms = createMpesaReceiveSms({
        receiptCode: txId,
        amount,
        balanceAfter: newBal,
        channel: 'stk_push',
        transactionId: txId,
      });

      setMpesaMessages(prev => [sms, ...prev]);
      setActiveMpesaSms(sms);
      setPushBannerSms(sms);
      playMpesaNotificationSound();
    } else {
      playMoneySentChime();
    }

    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
      colors: ['#10b981', '#14b8a6', '#059669'],
    });
    showToast(`Added KSh ${amount.toLocaleString()} via M-Pesa to your EchoPay wallet!`);
  };

  // Simulate or process receiving money from an M-Pesa sender
  const handleReceiveMoneyFromContact = (amount: number, senderName: string, senderPhone: string) => {
    const newBal = balance + amount;
    setBalance(newBal);

    const receiptCode = generateMpesaReceiptCode();
    const newTx: Transaction = {
      id: receiptCode,
      type: 'receive',
      recipientName: senderName,
      recipientPhoneOrAccount: senderPhone,
      amount: amount,
      fee: 0,
      totalDebited: amount,
      timestamp: 'Just now',
      status: 'completed',
      balanceAfter: newBal,
      note: `Received from ${senderName} via M-Pesa (Zero Fee)`,
      reference: 'M-Pesa Transfer',
    };

    setTransactions(prev => [newTx, ...prev]);

    const sms = createMpesaReceiveSms({
      receiptCode,
      amount,
      senderName,
      senderPhone,
      balanceAfter: newBal,
      channel: 'receive',
      transactionId: receiptCode,
    });

    setMpesaMessages(prev => [sms, ...prev]);
    setActiveMpesaSms(sms);
    setPushBannerSms(sms);
    playMpesaNotificationSound();

    confetti({
      particleCount: 65,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#14b8a6', '#059669'],
    });

    showToast(`M-Pesa Confirmed: Received KSh ${amount.toLocaleString()} from ${senderName}!`);
  };

  const handleViewMpesaSms = (receiptOrTxId: string) => {
    const existing = mpesaMessages.find(m => m.receiptCode === receiptOrTxId || m.transactionId === receiptOrTxId);
    if (existing) {
      setActiveMpesaSms(existing);
      return;
    }
    const tx = transactions.find(t => t.id === receiptOrTxId);
    if (tx) {
      const generated = createMpesaReceiveSms({
        receiptCode: tx.id,
        amount: tx.amount,
        senderName: tx.recipientName,
        senderPhone: tx.recipientPhoneOrAccount,
        balanceAfter: tx.balanceAfter,
        channel: tx.recipientName.includes('STK') ? 'stk_push' : 'receive',
        transactionId: tx.id,
      });
      setActiveMpesaSms(generated);
    }
  };

  const handleAddContact = (contact: Contact) => {
    setContacts(prev => [contact, ...prev]);
    showToast(`Contact "${contact.name}" added to EchoLink.`);
  };

  // Handle withdrawal from WithdrawModal
  const handleWithdrawModalSuccess = (details: {
    amount: number;
    fee: number;
    method: 'mpesa' | 'agent' | 'atm';
    targetTitle: string;
    targetSubtitle: string;
    receiptId: string;
    voucherCode?: string;
    note?: string;
  }) => {
    const total = Math.round((details.amount + details.fee) * 100) / 100;
    const newBal = Math.round((balance - total) * 100) / 100;
    setBalance(newBal);

    const now = new Date();
    const formattedDate = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newTx: Transaction = {
      id: details.receiptId,
      type: 'withdraw',
      recipientName: details.targetTitle,
      recipientPhoneOrAccount: details.targetSubtitle,
      amount: details.amount,
      fee: details.fee,
      totalDebited: total,
      timestamp: formattedDate,
      status: 'completed',
      balanceAfter: newBal,
      note: details.note || `Withdrawal via ${details.method.toUpperCase()}${details.voucherCode ? ` • Voucher: ${details.voucherCode}` : ''}`,
    };

    setTransactions(prev => [newTx, ...prev]);
    playMoneySentChime();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#14b8a6', '#047857'],
    });
    showToast(`Withdrew KSh ${details.amount.toLocaleString()} successfully (${details.method.toUpperCase()}).`);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${
      isDark 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-100/80 text-slate-800'
    }`}>
      
      {/* Network Header */}
      <NetworkHeader
        balance={balance}
        airtime={airtime}
        dataGb={dataGb}
        voiceMins={voiceMins}
        onOpenDeposit={() => setShowAddMoney(true)}
        onOpenWithdraw={() => setShowWithdrawModal(true)}
        onOpenReceive={() => setShowReceiveModal(true)}
        onOpenMpesaInbox={() => setShowMpesaInbox(true)}
        mpesaMessagesCount={mpesaMessages.length}
        onOpenSend={() => {
          setActiveTab('echopay');
          handleInitiateTransfer('', '', 200, 'send');
        }}
        onOpenUSSD={code => setUssdCode(code || '*144#')}
        onStartCall={handleStartCall}
        onOpenChangePin={() => openChangePin('verify')}
      />

      {/* Main Tab Navigation Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        <div className={`flex items-center justify-between border-b pb-3 transition-colors ${
          isDark ? 'border-slate-800/80' : 'border-slate-300/80'
        }`}>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('echopay')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-2xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'echopay'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                  : isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>EchoPay Mobile Money</span>
              <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border ${
                isDark 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                0% &lt; 150 KSh
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dialer')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-2xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'dialer'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                  : isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Calls & Video Link</span>
              <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                VoLTE HD
              </span>
            </button>
          </div>

          {/* Right Action Shortcuts */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReceiveModal(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-slate-800' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
              }`}
              title="Receive money via M-Pesa"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Receive</span>
            </button>

            <button
              onClick={() => setShowMpesaInbox(true)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition relative ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border-slate-300 shadow-sm'
              }`}
              title="View Safaricom M-Pesa Confirmation SMS Messages"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">M-Pesa SMS</span>
              {mpesaMessages.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setShowContacts(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border-slate-300 shadow-sm'
              }`}
              title="View Contacts Directory"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden md:inline">Contacts ({contacts.length})</span>
            </button>

            <button
              onClick={() => setUssdCode('*334#')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border-slate-300 shadow-sm'
              }`}
              title="Open USSD Simulator"
            >
              <Hash className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span className="hidden md:inline">USSD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'echopay' ? (
          <EchoPayTab
            balance={balance}
            transactions={transactions}
            contacts={contacts}
            onOpenSendModal={(name, phone) => {
              handleInitiateTransfer(name || '', phone || '', 200, 'send');
            }}
            onInitiateTransfer={handleInitiateTransfer}
            onSelectTransaction={tx => setSelectedReceipt(tx)}
            onBuyBundle={handleBuyBundle}
            onOpenContacts={() => setShowContacts(true)}
            onOpenChangePin={() => openChangePin('verify')}
            onOpenDeposit={() => setShowAddMoney(true)}
            onOpenWithdraw={() => setShowWithdrawModal(true)}
            onOpenReceive={() => setShowReceiveModal(true)}
            onOpenMpesaInbox={() => setShowMpesaInbox(true)}
            onViewMpesaSms={handleViewMpesaSms}
          />
        ) : (
          <DialerTab
            contacts={contacts}
            callHistory={callHistory}
            onStartCall={handleStartCall}
            onOpenContacts={() => setShowContacts(true)}
            onOpenUSSD={code => setUssdCode(code)}
            onSimulateIncomingCall={handleSimulateIncomingCall}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold border animate-in slide-in-from-bottom-5 ${
          isDark 
            ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200' 
            : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-950/10'
        }`}>
          <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL 1: Voice Call Modal */}
      {activeCall && activeCall.type === 'voice' && (
        <CallModal
          name={activeCall.name}
          phoneNumber={activeCall.phone}
          avatar={activeCall.avatar}
          onClose={handleEndCall}
          onOpenQuickSend={handleInCallQuickSend}
        />
      )}

      {/* MODAL 2: Ultra HD Video Call Modal */}
      {activeCall && activeCall.type === 'video' && (
        <VideoCallModal
          name={activeCall.name}
          phoneNumber={activeCall.phone}
          avatar={activeCall.avatar}
          onClose={handleEndCall}
          onOpenQuickSend={handleInCallQuickSend}
        />
      )}

      {/* MODAL 3: PIN Verification Modal */}
      {pendingTransfer && (
        <PinModal
          amount={pendingTransfer.amount}
          recipientName={pendingTransfer.recipientName}
          recipientAccount={pendingTransfer.recipientAccount}
          fee={pendingTransfer.fee}
          total={pendingTransfer.total}
          onConfirm={handleConfirmTransfer}
          onCancel={() => setPendingTransfer(null)}
          onChangePin={(mode) => openChangePin(mode || 'verify')}
        />
      )}

      {/* MODAL 4: Transaction Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* MODAL 5: Interactive USSD Modal */}
      {ussdCode && (
        <USSDModal
          initialCode={ussdCode}
          onClose={() => setUssdCode(null)}
        />
      )}

      {/* MODAL 6: Contacts Directory Modal */}
      {showContacts && (
        <ContactsModal
          contacts={contacts}
          onClose={() => setShowContacts(false)}
          onStartCall={handleStartCall}
          onSendMoney={(name, phone) => {
            setShowContacts(false);
            setActiveTab('echopay');
            handleInitiateTransfer(name, phone, 200, 'send');
          }}
          onAddContact={handleAddContact}
        />
      )}

      {/* MODAL 7: Add Money / Top Up Modal */}
      {showAddMoney && (
        <AddMoneyModal
          onClose={() => setShowAddMoney(false)}
          onAdd={handleAddMoney}
        />
      )}

      {/* MODAL 8: Change PIN Modal */}
      {changePinConfig.open && (
        <ChangePinModal
          initialMode={changePinConfig.mode}
          onClose={closeChangePin}
          onSuccess={() => {
            showToast('EchoPay PIN updated successfully!');
          }}
        />
      )}

      {/* MODAL 9: Withdraw Money Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          balance={balance}
          onClose={() => setShowWithdrawModal(false)}
          onWithdrawSuccess={handleWithdrawModalSuccess}
        />
      )}

      {/* MODAL 10: Incoming Call Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center text-white relative">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-semibold mb-3">
              <Radio className="w-4 h-4 animate-spin" />
              <span>Incoming {incomingCall.type === 'video' ? 'VoNR Video' : 'VoLTE HD'} Call</span>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-xl relative z-10">
                {incomingCall.avatar ? (
                  <img src={incomingCall.avatar} alt={incomingCall.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-emerald-400">
                    {incomingCall.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold">{incomingCall.name}</h3>
            <p className="text-sm font-mono text-slate-400 mt-0.5">{incomingCall.phone}</p>
            <p className="text-xs text-emerald-400 mt-2 animate-pulse font-medium">EchoLink 5G Carrier • Playing ringtone...</p>

            <div className="flex items-center justify-center space-x-8 mt-6">
              <div className="flex flex-col items-center">
                <button
                  onClick={handleDeclineIncomingCall}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 active:scale-95 transition"
                  title="Decline Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-400 mt-1.5">Decline</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleAcceptIncomingCall}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 active:scale-95 transition animate-bounce"
                  title="Answer Call"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-xs text-emerald-400 mt-1.5 font-semibold">Answer</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Push Banner for Incoming M-Pesa Payment Alert */}
      {pushBannerSms && (
        <MpesaPushBanner
          message={pushBannerSms}
          onViewDetails={msg => {
            setActiveMpesaSms(msg);
            setPushBannerSms(null);
          }}
          onDismiss={() => setPushBannerSms(null)}
        />
      )}

      {/* MODAL 11: M-Pesa Official Confirmation SMS Receipt Modal */}
      {activeMpesaSms && (
        <MpesaNotificationModal
          message={activeMpesaSms}
          onClose={() => setActiveMpesaSms(null)}
          onOpenInbox={() => {
            setActiveMpesaSms(null);
            setShowMpesaInbox(true);
          }}
        />
      )}

      {/* MODAL 12: M-Pesa SMS Confirmation Inbox */}
      {showMpesaInbox && (
        <MpesaInboxModal
          messages={mpesaMessages}
          onClose={() => setShowMpesaInbox(false)}
          onSelectMessage={msg => setActiveMpesaSms(msg)}
          onClearMessages={() => {
            setMpesaMessages([]);
            try {
              localStorage.removeItem('echolink_mpesa_sms');
            } catch {}
          }}
        />
      )}

      {/* MODAL 13: Receive Money & Incoming Payment Simulator */}
      {showReceiveModal && (
        <ReceiveMoneyModal
          contacts={contacts}
          currentBalance={balance}
          onClose={() => setShowReceiveModal(false)}
          onReceiveSuccess={handleReceiveMoneyFromContact}
        />
      )}

      {/* Footer Branding */}
      <footer className={`border-t py-4 px-6 text-center text-xs transition-colors ${
        isDark 
          ? 'border-slate-900 bg-slate-950 text-slate-500' 
          : 'border-slate-200 bg-white text-slate-600 shadow-inner'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              Echo Link Telecom & Fintech Ltd.
            </span>
            <span>•</span>
            <span>Licensed by Communications Authority of Kenya (CA) & CBK</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Tariff: 0% under 150 KSh • 2% Less than Standard Tariffs
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

