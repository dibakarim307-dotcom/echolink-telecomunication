import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  X, 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare,
  Send,
  Radio
} from 'lucide-react';
import { Contact } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ReceiveMoneyModalProps {
  onClose: () => void;
  contacts: Contact[];
  onSimulateReceive: (amount: number, senderName: string, senderPhone: string) => void;
  userPhone?: string;
}

export const ReceiveMoneyModal: React.FC<ReceiveMoneyModalProps> = ({
  onClose,
  contacts,
  onSimulateReceive,
  userPhone = '+254 779 123 456',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'blue';

  const [activeTab, setActiveTab] = useState<'details' | 'simulate'>('simulate');
  const [copied, setCopied] = useState(false);

  // Simulation Form
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contacts[0] || null);
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [amount, setAmount] = useState('1500');

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(userPhone.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    const name = selectedContact ? selectedContact.name : (customName.trim() || 'Safaricom M-Pesa Customer');
    const phone = selectedContact ? selectedContact.phoneNumber : (customPhone.trim() || '0712 345 678');

    onSimulateReceive(num, name, phone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-md border rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <ArrowDownLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Receive Money via M-Pesa</h3>
              <p className="text-xs text-emerald-100">Send confirmation SMS upon receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="p-4 pb-0 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('simulate')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'simulate'
                ? 'bg-emerald-600 text-white shadow-md'
                : isDark
                  ? 'bg-slate-950 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Incoming M-Pesa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-emerald-600 text-white shadow-md'
                : isDark
                  ? 'bg-slate-950 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>My QR & Phone Number</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'simulate' ? (
            <form onSubmit={handleSimulateSubmit} className="space-y-4">
              <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Testing incoming money: Select a sender to simulate receiving money from M-Pesa. Safaricom will send an official SMS confirmation message showing successful payment!
                </span>
              </div>

              {/* Sender Select */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Select Sending Contact
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {contacts.slice(0, 4).map(c => {
                    const isSelected = selectedContact?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedContact(c);
                          setCustomName('');
                          setCustomPhone('');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                          isSelected
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                            : isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs truncate font-medium">{c.name.split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{c.phoneNumber}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount to receive */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Amount Received (KSh)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    KSh
                  </span>
                  <input
                    type="number"
                    min="10"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`w-full border rounded-xl pl-12 pr-3 py-2.5 text-sm font-bold focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1.5 pt-2">
                  {[100, 500, 1500, 3000, 8000].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        parseFloat(amount) === p
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Simulate Receiving KSh {amount || '0'} from M-Pesa</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="w-48 h-48 mx-auto p-3 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col items-center justify-center">
                {/* Simulated QR Code */}
                <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-slate-950 rounded-lg">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-xs ${
                        (i % 2 === 0 || i % 5 === 0 || i < 7 || i > 28) ? 'bg-white' : 'bg-transparent'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                  Your Registered Phone Number
                </span>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {userPhone}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 transition"
                    title="Copy Phone Number"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Any Safaricom customer can send money directly to your phone number or scan this QR code. You will receive an instant Safaricom M-Pesa confirmation SMS upon receipt.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
