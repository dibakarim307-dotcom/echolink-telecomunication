import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Delete, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { playDTMF } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';
import { verifyStoredPin } from '../utils/pinService';

interface PinModalProps {
  amount: number;
  recipientName: string;
  recipientAccount: string;
  fee: number;
  total: number;
  onConfirm: () => void;
  onCancel: () => void;
  onChangePin?: (mode?: 'verify' | 'otp_reset') => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  amount,
  recipientName,
  recipientAccount,
  fee,
  total,
  onConfirm,
  onCancel,
  onChangePin,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDigits, setShowDigits] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = (digit: string) => {
    if (isVerifying) return;
    if (pin.length < 4) {
      playDTMF(digit, 0.1);
      setError(null);
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        setIsVerifying(true);
        setTimeout(() => {
          if (verifyStoredPin(nextPin)) {
            onConfirm();
          } else {
            playDTMF('0', 0.2);
            setError('Incorrect PIN. Please try again.');
            setIsVerifying(false);
            setPin('');
          }
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl relative flex flex-col items-center transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 p-2 rounded-full transition ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className={`text-lg font-bold tracking-tight text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Authorize Transaction
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5 mb-3">
          Enter your 4-digit EchoPay PIN
        </p>
        
        {/* Transfer Breakdown */}
        <div className={`text-center text-xs p-3 rounded-2xl border w-full mb-3 ${
          isDark 
            ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' 
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className={`flex justify-between py-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>To:</span>
            <span className={`font-semibold truncate max-w-[180px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{recipientName}</span>
          </div>
          <div className="flex justify-between text-slate-500 py-0.5">
            <span>Account:</span>
            <span className="font-mono">{recipientAccount}</span>
          </div>
          <div className={`flex justify-between py-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>Amount:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">KSh {amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-500 py-0.5">
            <span>Transaction Fee:</span>
            <span className={fee === 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : isDark ? "text-slate-300" : "text-slate-700"}>
              {fee === 0 ? "KSh 0.00 (FREE)" : `KSh ${fee.toFixed(2)} (2% lower)`}
            </span>
          </div>
          <div className={`border-t mt-1.5 pt-1.5 flex justify-between font-bold text-sm ${
            isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
          }`}>
            <span>Total Debited:</span>
            <span className="text-emerald-600 dark:text-emerald-300">KSh {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex flex-col items-center gap-1.5 animate-shake">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
            {onChangePin && (
              <button
                type="button"
                onClick={() => onChangePin('otp_reset')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold underline hover:opacity-80"
              >
                Forgot PIN? Reset via SMS or WhatsApp
              </button>
            )}
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex items-center space-x-3 mb-3">
          {[0, 1, 2, 3].map(index => {
            const isFilled = pin.length > index;
            const digitChar = pin[index];
            return (
              <div
                key={index}
                className={`w-9 h-11 rounded-xl border flex items-center justify-center font-mono font-bold text-lg transition-all ${
                  isFilled 
                    ? isDark
                      ? 'bg-emerald-500/20 border-emerald-500 text-white scale-105' 
                      : 'bg-emerald-50 border-emerald-500 text-slate-900 scale-105'
                    : isDark 
                      ? 'border-slate-700 bg-slate-800/40 text-transparent' 
                      : 'border-slate-300 bg-slate-50 text-transparent'
                }`}
              >
                {isFilled ? (showDigits ? digitChar : '•') : ''}
              </div>
            );
          })}
        </div>

        {/* Privacy & Change PIN Actions */}
        <div className="flex items-center justify-between w-full max-w-[280px] mb-4 px-1 text-xs">
          <button
            type="button"
            onClick={() => setShowDigits(!showDigits)}
            className={`flex items-center gap-1 transition ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{showDigits ? 'Mask' : 'Reveal'}</span>
          </button>

          {onChangePin && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onChangePin('otp_reset')}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                Forgot PIN?
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => onChangePin('verify')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <KeyRound className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              className={`py-3 rounded-2xl active:scale-95 text-xl font-bold font-mono transition shadow-xs ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:opacity-50'
              }`}
            >
              {digit}
            </button>
          ))}
          <button
            onClick={onCancel}
            disabled={isVerifying}
            className={`py-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center ${
              isDark ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400' : 'bg-slate-100/70 hover:bg-slate-200 text-slate-500'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className={`py-3 rounded-2xl active:scale-95 text-xl font-bold font-mono transition shadow-xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:opacity-50'
            }`}
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isVerifying}
            className={`py-3 rounded-2xl transition flex items-center justify-center ${
              isDark 
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50' 
                : 'bg-slate-100/70 hover:bg-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-50'
            }`}
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted on-device PIN verification</span>
        </div>
      </div>
    </div>
  );
};
