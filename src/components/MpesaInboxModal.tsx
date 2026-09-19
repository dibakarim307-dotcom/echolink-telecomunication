import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  ShieldCheck, 
  Search, 
  Copy, 
  Check, 
  Clock, 
  ArrowDownLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { MpesaSmsMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MpesaInboxModalProps {
  messages: MpesaSmsMessage[];
  onClose: () => void;
  onSelectMessage: (message: MpesaSmsMessage) => void;
  onClearMessages?: () => void;
}

export const MpesaInboxModal: React.FC<MpesaInboxModalProps> = ({
  messages,
  onClose,
  onSelectMessage,
  onClearMessages,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'blue';
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = messages.filter(m => 
    m.messageText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.receiptCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.fromNameOrPhone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-emerald-600/10 border-emerald-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-950/30">
              MP
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  M-Pesa Confirmation SMS Inbox
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Safaricom M-Pesa payment receipts ({messages.length})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by receipt code, name, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
              }`}
            />
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-semibold">No M-Pesa messages found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Incoming M-Pesa SMS payment alerts will automatically appear here.
              </p>
            </div>
          ) : (
            filtered.map(msg => (
              <div
                key={msg.id}
                onClick={() => {
                  onSelectMessage(msg);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                  isDark 
                    ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950' 
                    : 'bg-slate-50/80 border-slate-200 hover:border-emerald-400 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
                      {msg.receiptCode}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      + KSh {msg.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.timestamp}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, msg.messageText, msg.id)}
                      className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-emerald-500 transition"
                      title="Copy SMS"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs font-mono line-clamp-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {msg.messageText}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Balance After: <strong className="text-slate-700 dark:text-slate-200">KSh {msg.balanceAfter.toLocaleString()}</strong></span>
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
                    <span>View SMS Card</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
          <span>Automated Safaricom Daraja M-Pesa SMS Dispatcher Active</span>
          {onClearMessages && messages.length > 0 && (
            <button
              type="button"
              onClick={onClearMessages}
              className="text-[11px] text-red-500 hover:text-red-400 transition underline underline-offset-2 ml-2 shrink-0"
            >
              Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
