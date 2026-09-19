import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  MessageSquare, 
  ShieldCheck, 
  ArrowDownLeft, 
  Clock, 
  Smartphone,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { MpesaSmsMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MpesaNotificationModalProps {
  message: MpesaSmsMessage | null;
  onClose: () => void;
  onViewReceipt?: (transactionId: string) => void;
  onOpenInbox?: () => void;
}

export const MpesaNotificationModal: React.FC<MpesaNotificationModalProps> = ({
  message,
  onClose,
  onViewReceipt,
  onOpenInbox,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'blue';
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-md border rounded-3xl overflow-hidden shadow-2xl transition-all relative ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Safaricom M-Pesa Official Green Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 font-black text-xs flex items-center justify-center shadow-md">
              MP
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm tracking-wide">SAFARICOM M-PESA</span>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-[10px] text-emerald-100 font-medium block">
                Official Payment Confirmation • Sender: {message.sender}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-100">
              <Clock className="w-3.5 h-3.5 text-emerald-200" />
              <span>{message.timestamp}</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              {message.receiptCode}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Amount Badge */}
          <div className={`p-4 rounded-2xl border text-center transition-colors ${
            isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200'
          }`}>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider mb-0.5">
              Payment Successfully Received
            </span>
            <div className="flex items-center justify-center space-x-2">
              <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                + KSh {message.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              From: <strong className="text-slate-800 dark:text-slate-200">{message.fromNameOrPhone}</strong>
            </span>
          </div>

          {/* Authentic Safaricom SMS Text Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>M-Pesa SMS Confirmation Message</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 active:scale-95 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-mono leading-relaxed select-all relative ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-emerald-300' 
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <p>{message.messageText}</p>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className={`grid grid-cols-2 gap-2.5 text-xs p-3.5 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div>
              <span className="text-slate-400 block text-[11px]">Transaction ID</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{message.receiptCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Transaction Cost</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">KSh 0.00 (Zero Fee)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">New Wallet Balance</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                KSh {message.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Delivery Channel</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Safaricom Daraja SMS</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {onOpenInbox && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInbox();
                }}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open All M-Pesa SMS Messages</span>
              </button>
            )}

            {onViewReceipt && (
              <button
                type="button"
                onClick={() => {
                  onViewReceipt(message.transactionId);
                  onClose();
                }}
                className={`w-full py-3 rounded-2xl border text-xs sm:text-sm font-bold transition active:scale-98 flex items-center justify-center gap-2 ${
                  isDark 
                    ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' 
                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Full Transaction Statement</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3 rounded-2xl border text-xs sm:text-sm font-bold transition active:scale-98 ${
                isDark 
                  ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Done / Dismiss
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
