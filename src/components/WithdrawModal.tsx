import React, { useState, useEffect } from 'react';
import { 
  ArrowDownToLine, 
  X, 
  Check, 
  Smartphone, 
  Store, 
  CreditCard, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  QrCode, 
  Receipt, 
  Timer,
  Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { calculateWithdrawFee, generateTransactionId } from '../utils/feeCalculator';
import { sendMoneyViaB2C, getMpesaConfig, MpesaConfigInfo } from '../utils/mpesaClient';
import { playMoneySentChime } from '../utils/audio';

export type WithdrawMethod = 'mpesa' | 'agent' | 'atm';

interface WithdrawModalProps {
  balance: number;
  onClose: () => void;
  onWithdrawSuccess: (details: {
    amount: number;
    fee: number;
    method: WithdrawMethod;
    targetTitle: string;
    targetSubtitle: string;
    receiptId: string;
    voucherCode?: string;
    note?: string;
  }) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  balance,
  onClose,
  onWithdrawSuccess,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'blue';

  const [method, setMethod] = useState<WithdrawMethod>('mpesa');
  
  // M-Pesa Phone State
  const [phoneNumber, setPhoneNumber] = useState('07');
  
  // Agent State
  const [agentNumber, setAgentNumber] = useState('291040');
  const [storeNumber, setStoreNumber] = useState('101');
  
  // ATM State
  const [selectedAtmBank, setSelectedAtmBank] = useState('Equity Bank ATM');
  
  // Common Amount State
  const [amount, setAmount] = useState('500');
  
  // Security & Pin State
  const [step, setStep] = useState<'form' | 'pin' | 'processing' | 'success'>('form');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Config & Gateway State
  const [mpesaConfig, setMpesaConfig] = useState<MpesaConfigInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Result State
  const [resultData, setResultData] = useState<{
    receiptId: string;
    voucherCode?: string;
    method: WithdrawMethod;
    amount: number;
    fee: number;
  } | null>(null);

  useEffect(() => {
    getMpesaConfig().then(cfg => setMpesaConfig(cfg));
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const withdrawFee = calculateWithdrawFee(parsedAmount);
  const totalDebited = parsedAmount + withdrawFee;
  const isInsufficient = totalDebited > balance;

  // Preset quick amounts
  const presets = [100, 200, 500, 1000, 2500];

  const handleProceedToPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parsedAmount < 10) {
      setErrorMessage('Minimum withdrawal amount is KSh 10');
      return;
    }

    if (isInsufficient) {
      setErrorMessage(`Insufficient EchoPay balance. You need KSh ${totalDebited.toFixed(2)} (including KSh ${withdrawFee.toFixed(2)} fee) but your balance is KSh ${balance.toFixed(2)}.`);
      return;
    }

    if (method === 'mpesa') {
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      if (cleanPhone.length < 9) {
        setErrorMessage('Please enter a valid Safaricom phone number.');
        return;
      }
    } else if (method === 'agent') {
      if (!agentNumber || agentNumber.length < 4) {
        setErrorMessage('Please enter a valid 5-6 digit Agent Number.');
        return;
      }
    }

    setStep('pin');
    setPin('');
    setPinError(null);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('echopay_pin') || '1234';
    if (pin !== storedPin) {
      setPinError('Incorrect EchoPay PIN. (Demo default PIN is 1234)');
      setPin('');
      return;
    }

    setStep('processing');
    setIsSubmitting(true);
    setErrorMessage(null);

    const generatedReceipt = generateTransactionId();
    const generatedVoucher = `WH-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      if (method === 'mpesa') {
        // Disburse funds via Safaricom Daraja B2C Payout
        const res = await sendMoneyViaB2C({
          phoneNumber: phoneNumber.trim(),
          amount: parsedAmount,
          remarks: 'EchoPay Wallet Withdrawal',
          occasion: 'EchoPay',
        });

        const receiptId = res.mpesaReceiptNumber || generatedReceipt;

        setResultData({
          receiptId,
          voucherCode: generatedVoucher,
          method: 'mpesa',
          amount: parsedAmount,
          fee: withdrawFee,
        });

        playMoneySentChime();
        setStep('success');

        onWithdrawSuccess({
          amount: parsedAmount,
          fee: withdrawFee,
          method: 'mpesa',
          targetTitle: `M-Pesa Payout (${phoneNumber})`,
          targetSubtitle: `Safaricom Daraja B2C • Ref: ${receiptId}`,
          receiptId,
          note: `Withdrawn to M-Pesa phone ${phoneNumber} (B2C Payout)`,
        });
      } else if (method === 'agent') {
        // EchoLink / M-Pesa Agent Voucher
        await new Promise(r => setTimeout(r, 700));

        setResultData({
          receiptId: generatedReceipt,
          voucherCode: generatedVoucher,
          method: 'agent',
          amount: parsedAmount,
          fee: withdrawFee,
        });

        playMoneySentChime();
        setStep('success');

        onWithdrawSuccess({
          amount: parsedAmount,
          fee: withdrawFee,
          method: 'agent',
          targetTitle: `Agent ${agentNumber}`,
          targetSubtitle: `Store: ${storeNumber} • Voucher: ${generatedVoucher}`,
          receiptId: generatedReceipt,
          voucherCode: generatedVoucher,
          note: `Cash Withdrawal at Agent ${agentNumber} (Store ${storeNumber})`,
        });
      } else {
        // ATM Withdrawal
        await new Promise(r => setTimeout(r, 700));

        const atmVoucher = String(Math.floor(100000 + Math.random() * 900000));
        setResultData({
          receiptId: generatedReceipt,
          voucherCode: atmVoucher,
          method: 'atm',
          amount: parsedAmount,
          fee: withdrawFee,
        });

        playMoneySentChime();
        setStep('success');

        onWithdrawSuccess({
          amount: parsedAmount,
          fee: withdrawFee,
          method: 'atm',
          targetTitle: selectedAtmBank,
          targetSubtitle: `ATM One-Time Code: ${atmVoucher}`,
          receiptId: generatedReceipt,
          voucherCode: atmVoucher,
          note: `Cardless ATM Withdrawal at ${selectedAtmBank}`,
        });
      }
    } catch (err: any) {
      console.warn('Withdrawal error:', err);
      setErrorMessage(err.message || 'Withdrawal processing encountered an issue.');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all relative ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between relative ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/30">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                Withdraw Funds
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  2% Less Fee
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disburse to Safaricom M-Pesa, Agent, or Cardless ATM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: FORM SELECTION & AMOUNT */}
        {step === 'form' && (
          <form onSubmit={handleProceedToPin} className="p-5 sm:p-6 space-y-5">
            {/* Wallet Balance Summary Card */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                  Available EchoPay Balance
                </span>
                <span className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  KSh {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                Micro &lt; 150 KSh Free
              </span>
            </div>

            {/* Withdrawal Method Switcher */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Choose Withdrawal Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mpesa', label: 'M-Pesa (B2C)', icon: Smartphone, desc: 'Instant Payout' },
                  { id: 'agent', label: 'Agent', icon: Store, desc: 'Cash Voucher' },
                  { id: 'atm', label: 'Cardless ATM', icon: CreditCard, desc: '6-digit Code' },
                ].map(item => {
                  const Icon = item.icon;
                  const active = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMethod(item.id as WithdrawMethod)}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-start transition ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30'
                          : isDark
                            ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1.5" />
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Details Input */}
            {method === 'mpesa' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Safaricom Phone Number
                  </label>
                  {mpesaConfig?.hasSecurityCredential && (
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Daraja B2C Ready
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712 345 678 or 2547..."
                  className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Funds are sent directly to this Safaricom line using Daraja B2C disbursement.
                </p>
              </div>
            )}

            {method === 'agent' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Agent Number
                  </label>
                  <input
                    type="text"
                    value={agentNumber}
                    onChange={e => setAgentNumber(e.target.value)}
                    placeholder="e.g. 291040"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Store Number
                  </label>
                  <input
                    type="text"
                    value={storeNumber}
                    onChange={e => setStoreNumber(e.target.value)}
                    placeholder="e.g. 101"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                </div>
              </div>
            )}

            {method === 'atm' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Partner ATM
                </label>
                <select
                  value={selectedAtmBank}
                  onChange={e => setSelectedAtmBank(e.target.value)}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                >
                  <option value="Equity Bank ATM">Equity Bank ATM (Cardless)</option>
                  <option value="Kenya Commercial Bank (KCB) ATM">KCB ATM (Vooma / Cardless)</option>
                  <option value="Co-operative Bank ATM">Co-op Bank ATM</option>
                  <option value="Diamond Trust Bank (DTB)">DTB ATM</option>
                  <option value="Stanbic Bank ATM">Stanbic Bank ATM</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Generates an instant 6-digit withdrawal code for the ATM screen keypad.
                </p>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Withdrawal Amount (KSh)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    // Maximum withdrawable = balance minus fee
                    const maxGuess = Math.max(1, balance - calculateWithdrawFee(balance));
                    setAmount(String(Math.floor(maxGuess)));
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Withdraw Max
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  KSh
                </span>
                <input
                  type="number"
                  min="10"
                  max="150000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
              </div>

              {/* Amount Quick Presets */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 scrollbar-none">
                {presets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition shrink-0 ${
                      parsedAmount === p
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    KSh {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Breakdown Card */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Withdrawal Amount:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  KSh {parsedAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span>EchoLink Withdrawal Fee:</span>
                  <span className="text-[10px] text-emerald-500 font-bold">(2% Lower)</span>
                </span>
                <span className={`font-bold ${withdrawFee === 0 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                  {withdrawFee === 0 ? '0.00 KSh (FREE)' : `KSh ${withdrawFee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">Total Deducted:</span>
                <span className={`text-sm ${isInsufficient ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  KSh {totalDebited.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isInsufficient || parsedAmount <= 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white transition shadow-lg ${
                isInsufficient || parsedAmount <= 0
                  ? 'bg-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 shadow-emerald-950/40'
              }`}
            >
              {isInsufficient ? 'Insufficient Balance' : 'Continue to PIN Verification'}
            </button>
          </form>
        )}

        {/* STEP 2: PIN ENTRY */}
        {step === 'pin' && (
          <form onSubmit={handlePinSubmit} className="p-5 sm:p-6 space-y-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black">Authorize Withdrawal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confirm deduction of <span className="font-bold text-emerald-500">KSh {totalDebited.toFixed(2)}</span> ({method.toUpperCase()})
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Enter 4-Digit EchoPay PIN
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className={`w-full text-center tracking-[1em] text-2xl font-mono py-3 rounded-2xl border focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                }`}
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Demo Default PIN: <strong className="text-emerald-500">1234</strong>
              </span>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className={`py-3 rounded-2xl text-xs font-bold border transition ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={pin.length !== 4}
                className="py-3 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-950/40"
              >
                Confirm & Withdraw
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PROCESSING */}
        {step === 'processing' && (
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse border border-emerald-500/30">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-black">Processing Withdrawal...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {method === 'mpesa'
                  ? 'Connecting to Safaricom Daraja B2C gateway with verified security credential...'
                  : 'Generating your cash withdrawal security token...'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && resultData && (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                Withdrawal Successful
              </span>
              <h3 className="text-2xl font-black mt-1">
                KSh {resultData.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {method === 'mpesa' && `Disbursed to Safaricom line ${phoneNumber}`}
                {method === 'agent' && `Ready for cash pickup at Agent ${agentNumber}`}
                {method === 'atm' && `Ready for cardless withdrawal at ${selectedAtmBank}`}
              </p>
            </div>

            {/* Voucher or Receipt Box */}
            <div className={`p-4 rounded-2xl border text-left space-y-2 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-emerald-500">{resultData.receiptId}</span>
              </div>

              {resultData.voucherCode && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {method === 'atm' ? 'ATM Withdrawal Code' : 'Agent Cash Token'}
                    </span>
                    <span className="font-mono font-black text-lg text-slate-900 dark:text-white tracking-widest">
                      {resultData.voucherCode}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-amber-500 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Valid 2 Hours</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>EchoLink Fee Applied:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {resultData.fee === 0 ? '0.00 KSh (Free)' : `KSh ${resultData.fee.toFixed(2)}`}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
            >
              Done & View Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
