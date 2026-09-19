import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Share2, Download, Printer, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { Transaction } from '../types';
import { getStandardTariff } from '../utils/feeCalculator';
import { useTheme } from '../context/ThemeContext';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  // Build authentic telecom SMS notification text
  const standardFee = getStandardTariff(transaction.amount);
  const savings = Math.max(0, standardFee - transaction.fee);

  const smsText = `${transaction.id} Confirmed. Ksh ${transaction.amount.toFixed(2)} sent to ${transaction.recipientName} (${transaction.recipientPhoneOrAccount}) on ${transaction.timestamp}. Transaction fee Ksh ${transaction.fee.toFixed(2)}${transaction.amount < 150 ? ' (0% Free on EchoLink)' : ' (2% lower than standard)'}. New EchoPay balance is Ksh ${transaction.balanceAfter.toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`;

  const handleCopySMS = () => {
    navigator.clipboard.writeText(smsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mb-2 shadow-lg shadow-emerald-950/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            EchoPay Payment Confirmed
          </span>
          <h2 className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            KSh {transaction.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            Ref: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{transaction.id}</span>
          </p>
        </div>

        {/* Fee Savings Banner */}
        {transaction.amount < 150 ? (
          <div className={`mb-4 p-3 rounded-2xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-emerald-950/60 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className={`flex items-center space-x-2 font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Zero-Fee Promotion: Under 150 KSh is 100% Free!</span>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
              Fee: KSh 0.00
            </span>
          </div>
        ) : (
          <div className={`mb-4 p-3 rounded-2xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className={`flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>2% lower than standard tariff ({transaction.fee.toFixed(2)} KSh vs standard {standardFee.toFixed(2)} KSh)</span>
            </div>
            {savings > 0 && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Saved KSh {savings.toFixed(2)} vs Standard Tariffs
              </span>
            )}
          </div>
        )}

        {/* Transaction Details Card */}
        <div className={`rounded-2xl p-4 border space-y-2.5 text-xs ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span>Recipient</span>
            <span className={`font-bold text-right ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{transaction.recipientName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Phone / Account</span>
            <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{transaction.recipientPhoneOrAccount}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Transaction Type</span>
            <span className={`capitalize font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{transaction.type}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Date & Time</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{transaction.timestamp}</span>
          </div>
          {transaction.note && (
            <div className="flex justify-between items-center text-slate-500">
              <span>Note</span>
              <span className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{transaction.note}</span>
            </div>
          )}

          <div className={`border-t pt-2 space-y-1 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center text-slate-500">
              <span>Amount Sent</span>
              <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>KSh {transaction.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Transaction Fee</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                {transaction.fee === 0 ? 'KSh 0.00 (FREE)' : `KSh ${transaction.fee.toFixed(2)} (2% lower)`}
              </span>
            </div>
            <div className={`flex justify-between items-center font-bold text-sm pt-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              <span>Total Debited</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                KSh {transaction.totalDebited.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 pt-1">
              <span>New EchoPay Balance</span>
              <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                KSh {transaction.balanceAfter.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* SMS Receipt Simulation */}
        <div className={`mt-4 p-3 rounded-2xl border ${
          isDark ? 'bg-slate-950 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-500 flex items-center gap-1">
              Official EchoPay SMS Notification
            </span>
            <button
              onClick={handleCopySMS}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:opacity-80 flex items-center gap-1 font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy SMS'}</span>
            </button>
          </div>
          <p className={`text-[11px] font-mono leading-relaxed p-2.5 rounded-xl select-all border ${
            isDark ? 'text-slate-300 bg-slate-900/70 border-slate-800' : 'text-slate-800 bg-white border-slate-200'
          }`}>
            {smsText}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handlePrint}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition"
          >
            <span>Done</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
