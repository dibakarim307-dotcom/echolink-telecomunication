import React, { useState, useEffect } from 'react';
import { 
  Signal, 
  Wifi, 
  Battery, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Zap, 
  PhoneCall, 
  Send, 
  Sparkles,
  ArrowUpRight,
  PlusCircle,
  Hash,
  Sun,
  Moon,
  KeyRound,
  ArrowDownToLine,
  ArrowDownLeft,
  MessageSquare
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NetworkHeaderProps {
  balance: number;
  airtime: number;
  dataGb: number;
  voiceMins: number;
  onOpenDeposit: () => void;
  onOpenWithdraw?: () => void;
  onOpenReceive?: () => void;
  onOpenMpesaInbox?: () => void;
  mpesaMessagesCount?: number;
  onOpenSend: () => void;
  onOpenUSSD: (code?: string) => void;
  onStartCall: (name: string, phone: string, type: 'voice' | 'video') => void;
  onOpenChangePin?: () => void;
}

export const NetworkHeader: React.FC<NetworkHeaderProps> = ({
  balance,
  airtime,
  dataGb,
  voiceMins,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenReceive,
  onOpenMpesaInbox,
  mpesaMessagesCount = 0,
  onOpenSend,
  onOpenUSSD,
  onOpenChangePin,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showBalance, setShowBalance] = useState(true);
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const isDark = theme === 'dark';

  return (
    <header className={`w-full sticky top-0 z-30 shadow-md backdrop-blur-md transition-colors duration-200 ${
      isDark 
        ? 'bg-slate-900/95 border-b border-slate-800 text-slate-100' 
        : 'bg-white/95 border-b border-slate-200 text-slate-800'
    }`}>
      {/* Telecom System Status Bar */}
      <div className={`px-4 py-1.5 flex items-center justify-between text-xs font-mono transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-950 text-slate-400 border-b border-slate-800/60' 
          : 'bg-slate-100 text-slate-600 border-b border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ECHOLINK 5G SA</span>
          </div>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-600">|</span>
          <span className={`hidden sm:inline font-sans font-medium px-1.5 py-0.5 rounded text-[10px] ${
            isDark 
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
          }`}>
            VoLTE HD OPUS 48kHz
          </span>
          <span className="hidden md:inline text-slate-500">SIM 1: +254 779 123 456</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1" title="Signal Strength: Excellent 5G -72dBm">
            <Signal className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden sm:inline text-[11px] text-slate-600 dark:text-slate-300">5G+</span>
          </div>
          <Wifi className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
            <span>98%</span>
            <Battery className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <span className="font-medium pl-1 text-slate-700 dark:text-slate-200">{time || '12:00'}</span>
        </div>
      </div>

      {/* Main Brand & Balance Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Value Proposition */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-900/30 text-white font-black text-xl tracking-tight">
              EL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-xl font-bold tracking-tight flex items-center gap-1.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Echo Link
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    isDark 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    Telecom & Money
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Zero fee under KSh 150 • 2% lower than standard rates
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 md:hidden">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              className={`p-2 rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile USSD Trigger */}
            <button
              onClick={() => onOpenUSSD('*144#')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                isDark 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>*144#</span>
            </button>
          </div>
        </div>

        {/* Quick Balances Grid */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {/* EchoPay Wallet Card */}
          <div className={`rounded-xl p-2.5 px-3.5 border flex items-center space-x-3 transition shadow-sm ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/80' 
              : 'bg-slate-50 border-slate-200/90'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>EchoPay Wallet</span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showBalance ? 'Hide balance' : 'Show balance'}
                >
                  {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                {onOpenChangePin && (
                  <button
                    onClick={onOpenChangePin}
                    className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition ml-1"
                    title="Change EchoPay PIN"
                  >
                    <KeyRound className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {showBalance ? `KSh ${balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '••••••••'}
              </div>
            </div>
          </div>

          {/* Airtime & Data Quick Badges */}
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <div className={`border rounded-xl px-3 py-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Airtime</span>
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>KSh {airtime.toFixed(2)}</span>
            </div>
            <div className={`border rounded-xl px-3 py-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">5G Data</span>
              <span className="font-bold text-teal-600 dark:text-teal-300">{dataGb} GB</span>
            </div>
            <div className={`border rounded-xl px-3 py-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Echo Voice</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-300">{voiceMins} Mins</span>
            </div>
          </div>

          {/* Action Buttons & Theme Switcher */}
          <div className="flex items-center space-x-2 ml-auto md:ml-0">
            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-700">Dark</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenDeposit}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
              }`}
              title="Add money to EchoPay"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Add Money</span>
            </button>
            {onOpenReceive && (
              <button
                onClick={onOpenReceive}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                }`}
                title="Receive money & simulate incoming M-Pesa payment"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Receive</span>
              </button>
            )}
            {onOpenWithdraw && (
              <button
                onClick={onOpenWithdraw}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                }`}
                title="Withdraw cash or disburse to M-Pesa"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                <span>Withdraw</span>
              </button>
            )}
            {onOpenMpesaInbox && (
              <button
                onClick={onOpenMpesaInbox}
                className={`flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition relative ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                }`}
                title="View Safaricom M-Pesa SMS Confirmation Messages"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">SMS</span>
                {mpesaMessagesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5" />
                )}
              </button>
            )}
            {onOpenChangePin && (
              <button
                onClick={onOpenChangePin}
                className={`hidden sm:flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                }`}
                title="Change or reset transaction PIN"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>PIN</span>
              </button>
            )}
            <button
              onClick={onOpenSend}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-md shadow-emerald-900/30 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Money</span>
            </button>
            <button
              onClick={() => onOpenUSSD('*334#')}
              className={`hidden lg:flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border-slate-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="Quick USSD Sim Menu"
            >
              <Hash className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>*334# USSD</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

