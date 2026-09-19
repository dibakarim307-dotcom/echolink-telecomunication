import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  X, 
  Check, 
  Building2, 
  CreditCard, 
  Sparkles, 
  Smartphone, 
  Loader2, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Radio,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { 
  getMpesaConfig, 
  requestMpesaStkPush, 
  queryMpesaStatus, 
  simulatePinConfirmation,
  MpesaConfigInfo,
  StkInitiateResponse
} from '../utils/mpesaClient';
import { playMoneySentChime, playMpesaNotificationSound } from '../utils/audio';
import { formatMpesaReceiveMessage } from '../utils/mpesaSms';

interface AddMoneyModalProps {
  onClose: () => void;
  onAdd: (amount: number, source: string, receiptId?: string) => void;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ onClose, onAdd }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'blue';

  const [paymentChannel, setPaymentChannel] = useState<'mpesa' | 'bank'>('mpesa');
  
  // M-Pesa Form State
  const [phoneNumber, setPhoneNumber] = useState('07');
  const [amount, setAmount] = useState('500');
  const [bankSource, setBankSource] = useState('Kenya Commercial Bank (KCB)');
  
  // Daraja Gateway State
  const [mpesaConfig, setMpesaConfig] = useState<MpesaConfigInfo | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // STK Push Processing State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stkData, setStkData] = useState<StkInitiateResponse | null>(null);
  const [isWaitingForPin, setIsWaitingForPin] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [stkStatus, setStkStatus] = useState<'IDLE' | 'SENT' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [completedReceipt, setCompletedReceipt] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    getMpesaConfig().then(cfg => {
      setMpesaConfig(cfg);
      setLoadingConfig(false);
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleInitiateMpesaStk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num < 1) {
      setErrorMessage('Please enter an amount of at least KSh 10');
      return;
    }

    if (!phoneNumber || phoneNumber.trim().length < 9) {
      setErrorMessage('Please enter a valid Safaricom phone number (e.g. 0723457685)');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestMpesaStkPush({
        phoneNumber: phoneNumber.trim(),
        amount: num,
        accountReference: 'EchoPayWallet',
        description: 'Wallet TopUp',
      });

      if (response.success && response.checkoutRequestId) {
        setStkData(response);
        setIsWaitingForPin(true);
        setStkStatus('SENT');

        // Start polling Daraja query endpoint
        startPollingStatus(response.checkoutRequestId, num);
      } else {
        setErrorMessage(response.error || 'Failed to dispatch M-Pesa prompt.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to Safaricom Daraja gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPollingStatus = (checkoutId: string, depositAmount: number) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const queryRes = await queryMpesaStatus(checkoutId);
        if (queryRes.status === 'COMPLETED') {
          clearInterval(pollTimerRef.current);
          handlePaymentSuccess(queryRes.mpesaReceiptNumber || 'QK' + Math.floor(10000000 + Math.random() * 90000000), depositAmount);
        } else if (queryRes.status === 'FAILED' || queryRes.status === 'CANCELLED') {
          clearInterval(pollTimerRef.current);
          setStkStatus('FAILED');
          setErrorMessage(queryRes.resultDesc || 'M-Pesa transaction was cancelled or declined.');
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2500);
  };

  const handleSimulatePinSubmit = async () => {
    if (!stkData?.checkoutRequestId) return;
    setIsSubmitting(true);
    try {
      const num = parseFloat(amount);
      const res = await simulatePinConfirmation(stkData.checkoutRequestId);
      if (res.status === 'COMPLETED') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        handlePaymentSuccess(res.mpesaReceiptNumber || 'QK' + Math.floor(10000000 + Math.random() * 90000000), num);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (receipt: string, depositAmount: number) => {
    setCompletedReceipt(receipt);
    setStkStatus('SUCCESS');
    setIsWaitingForPin(false);
    playMpesaNotificationSound();

    setTimeout(() => {
      onAdd(depositAmount, 'M-Pesa STK Push', receipt);
      onClose();
    }, 2800);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    onAdd(num, bankSource);
    onClose();
  };

  const quickAmounts = [10, 20, 50, 100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl relative transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        <button
          onClick={() => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            onClose();
          }}
          className={`absolute top-4 right-4 p-2 rounded-full transition ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Top-Up EchoPay Wallet
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Zero-fee instant deposit with real-time settlement
            </p>
          </div>
        </div>

        {/* Channel Selector Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 my-4">
          <button
            type="button"
            onClick={() => {
              setPaymentChannel('mpesa');
              setIsWaitingForPin(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              paymentChannel === 'mpesa'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Lipa Na M-Pesa (STK)</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPaymentChannel('bank');
              setIsWaitingForPin(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              paymentChannel === 'bank'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank / Card</span>
          </button>
        </div>

        {/* SCREEN 1: WAITING FOR M-PESA HANDSET PIN */}
        {isWaitingForPin ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in">
            {/* Phone graphic with prompt */}
            <div className={`p-4 rounded-2xl border text-left relative overflow-hidden ${
              isDark ? 'bg-slate-950 border-emerald-500/40' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>M-Pesa STK Prompt Dispatched</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Shortcode: {mpesaConfig?.shortCode || '174379'}</span>
              </div>

              <div className={`p-3 rounded-xl border text-xs font-mono mb-3 ${
                isDark ? 'bg-slate-900 border-slate-800 text-emerald-300' : 'bg-white border-emerald-100 text-slate-800'
              }`}>
                <p className="font-bold text-emerald-500 dark:text-emerald-400 mb-1">Lipa Na M-PESA Online</p>
                <p>Do you want to pay KSh {parseFloat(amount).toLocaleString()} to EchoLink Telecom?</p>
                <p className="text-[11px] text-slate-500 mt-1">Target Phone: {phoneNumber}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-2">Enter M-Pesa PIN:</p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Check your phone screen to enter PIN...</span>
              </div>
            </div>

            {/* Quick Sandbox PIN verification helper */}
            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="text-[11px] font-semibold text-slate-400 mb-2">
                Sandbox & Test Simulation: Enter PIN or tap Approve
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN"
                  value={pinEntry}
                  onChange={e => setPinEntry(e.target.value)}
                  className={`w-24 text-center tracking-widest font-mono text-sm py-2 px-3 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSimulatePinSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Deposit (Sandbox)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                setIsWaitingForPin(false);
                setStkStatus('IDLE');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 hover:underline"
            >
              Cancel Prompt & Edit Amount
            </button>
          </div>
        ) : stkStatus === 'SUCCESS' ? (
          /* SCREEN 2: SUCCESS RECEIPT & CONFIRMATION MESSAGE */
          <div className="py-5 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-emerald-500">M-Pesa Payment Received!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                KSh {parseFloat(amount).toLocaleString()} credited to your EchoPay wallet.
              </p>
            </div>

            {/* Official Confirmation SMS Preview */}
            <div className={`text-left p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Safaricom M-Pesa SMS Dispatched</span>
                </span>
                <span className="font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Sender: MPESA
                </span>
              </div>
              <p className="font-mono text-xs text-slate-700 dark:text-emerald-300 leading-relaxed bg-black/5 dark:bg-black/40 p-2.5 rounded-xl border border-black/10 dark:border-white/5 select-all">
                {completedReceipt || 'QK89123041'} Confirmed. Ksh{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received from Safaricom M-Pesa via Lipa Na M-Pesa for account EchoPay Wallet on {new Date().getDate()}/{new Date().getMonth() + 1}/{String(new Date().getFullYear()).slice(-2)} at {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}. Transaction cost, Ksh0.00.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>Updating wallet & opening official statement...</span>
            </div>
          </div>
        ) : paymentChannel === 'mpesa' ? (
          /* SCREEN 3: M-PESA DARAJA INPUT FORM */
          <form onSubmit={handleInitiateMpesaStk} className="space-y-4">
            {/* Gateway Status Badge */}
            <div className={`py-2 px-3 rounded-2xl border flex items-center justify-between text-[11px] ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-emerald-50/50 border-emerald-100'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {mpesaConfig?.label || 'Safaricom Daraja API Active'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {mpesaConfig?.hasSecurityCredential && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-medium border border-emerald-500/20">
                    Security Credential Verified
                  </span>
                )}
                <span className="font-mono text-slate-500 text-[10px]">
                  Paybill: {mpesaConfig?.shortCode || '174379'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Top-Up Amount (KSh)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  KSh
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="1"
                  step="1"
                  placeholder="500"
                  className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Quick amount chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q.toString())}
                  className={`px-2.5 py-1 rounded-xl text-xs transition font-mono ${
                    amount === q.toString()
                      ? 'bg-emerald-600 text-white font-bold'
                      : isDark 
                        ? 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  +{q.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Phone Number Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  M-Pesa Mobile Number
                </label>
                <button
                  type="button"
                  onClick={() => setPhoneNumber('07')}
                  className="text-[10px] text-emerald-500 hover:underline font-medium"
                >
                  Use My Line
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 text-xs font-bold text-slate-400 border-r border-slate-300 dark:border-slate-700 pr-2">
                  <span>🇰🇪</span>
                  <span>+254</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="07"
                  className={`w-full border rounded-2xl pl-24 pr-4 py-3 text-sm font-semibold focus:outline-none transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Supports all Safaricom lines (07XX or 01XX). STK push prompt will appear instantly.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Safaricom Daraja...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>Send M-Pesa STK Push Prompt (Zero Fee)</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* SCREEN 4: TRADITIONAL BANK / CARD DEPOSIT */
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Deposit Amount (KSh)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  KSh
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="50"
                  className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Source Bank / Card
              </label>
              <select
                value={bankSource}
                onChange={e => setBankSource(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-2.5 text-xs focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                }`}
              >
                <option value="Kenya Commercial Bank (KCB)">Kenya Commercial Bank (KCB)</option>
                <option value="Equity Bank Kenya">Equity Bank Kenya</option>
                <option value="Co-operative Bank">Co-operative Bank of Kenya</option>
                <option value="NCBA Bank">NCBA Bank Loop</option>
                <option value="Visa / Mastercard">Visa / Mastercard Debit</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition active:scale-98"
            >
              Confirm Bank Deposit (Zero Fee)
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
