import React, { useState } from 'react';
import { 
  Send, 
  Receipt, 
  Store, 
  ArrowDownToLine, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  TrendingUp, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Zap, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Calculator,
  Sliders,
  Users,
  KeyRound,
  Lock,
  MessageSquare
} from 'lucide-react';
import { Contact, Transaction, PayBillOption, DataBundle } from '../types';
import { calculateEchoFee, getStandardTariff, getFeeComparison } from '../utils/feeCalculator';
import { POPULAR_PAYBILLS, DATA_BUNDLES } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';

interface EchoPayTabProps {
  balance: number;
  transactions: Transaction[];
  contacts: Contact[];
  onOpenSendModal: (recipientName?: string, recipientPhone?: string) => void;
  onInitiateTransfer: (recipientName: string, recipientAccount: string, amount: number, type: Transaction['type'], note?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onBuyBundle: (bundle: DataBundle) => void;
  onOpenContacts: () => void;
  onOpenChangePin?: () => void;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenReceive?: () => void;
  onOpenMpesaInbox?: () => void;
  onViewMpesaSms?: (receiptCode: string) => void;
}

export const EchoPayTab: React.FC<EchoPayTabProps> = ({
  balance,
  transactions,
  contacts,
  onInitiateTransfer,
  onSelectTransaction,
  onBuyBundle,
  onOpenContacts,
  onOpenChangePin,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenReceive,
  onOpenMpesaInbox,
  onViewMpesaSms,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeView, setActiveView] = useState<'send' | 'paybill' | 'till' | 'airtime' | 'withdraw' | 'calculator' | 'security'>('send');
  
  // P2P Send State
  const [sendPhone, setSendPhone] = useState('');
  const [sendName, setSendName] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');

  // PayBill State
  const [selectedPayBill, setSelectedPayBill] = useState<PayBillOption | null>(POPULAR_PAYBILLS[0]);
  const [customBizNo, setCustomBizNo] = useState('');
  const [accountNo, setAccountNo] = useState(POPULAR_PAYBILLS[0].defaultAccount || '');
  const [paybillAmount, setPaybillAmount] = useState('');

  // Till State
  const [tillNumber, setTillNumber] = useState('');
  const [tillStoreName, setTillStoreName] = useState('');
  const [tillAmount, setTillAmount] = useState('');

  // Withdraw State
  const [withdrawChannel, setWithdrawChannel] = useState<'mpesa' | 'agent' | 'atm'>('mpesa');
  const [withdrawPhone, setWithdrawPhone] = useState('07');
  const [agentNumber, setAgentNumber] = useState('291040');
  const [withdrawAmount, setWithdrawAmount] = useState('500');

  // Calculator State
  const [calcAmount, setCalcAmount] = useState(500);

  // Filter Transaction history
  const [historyFilter, setHistoryFilter] = useState<'all' | 'send' | 'receive' | 'paybill' | 'till' | 'withdraw'>('all');
  const [searchHistory, setSearchHistory] = useState('');

  // Handle phone change and auto lookup contact
  const handlePhoneChange = (val: string) => {
    setSendPhone(val);
    const clean = val.replace(/\s+/g, '');
    const found = contacts.find(c => c.phoneNumber.replace(/\s+/g, '') === clean);
    if (found) {
      setSendName(found.name);
    }
  };

  const handleSelectContactForSend = (contact: Contact) => {
    setSendPhone(contact.phoneNumber);
    setSendName(contact.name);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onInitiateTransfer(
      sendName || `Recipient (${sendPhone})`,
      sendPhone,
      amountNum,
      'send',
      sendNote || 'EchoPay P2P Transfer'
    );
  };

  const handlePayBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paybillAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const bizName = selectedPayBill ? selectedPayBill.name : `Business ${customBizNo}`;
    const bizNo = selectedPayBill ? selectedPayBill.businessNumber : customBizNo;

    onInitiateTransfer(
      bizName,
      `${bizNo} / Acc: ${accountNo}`,
      amountNum,
      'paybill',
      `PayBill ${bizNo} (${accountNo})`
    );
  };

  const handleTillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(tillAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onInitiateTransfer(
      tillStoreName || `Merchant Till ${tillNumber}`,
      `Till: ${tillNumber}`,
      amountNum,
      'till',
      `Buy Goods at Till ${tillNumber}`
    );
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (withdrawChannel === 'mpesa') {
      const phone = withdrawPhone || '0779123456';
      onInitiateTransfer(
        `M-Pesa Mobile Payout (${phone})`,
        phone,
        amountNum,
        'withdraw',
        `Disbursement to Safaricom line ${phone}`
      );
    } else if (withdrawChannel === 'atm') {
      onInitiateTransfer(
        'Cardless ATM Cash Voucher',
        'ATM One-Time PIN',
        amountNum,
        'withdraw',
        'ATM Cardless Cash Withdrawal Voucher'
      );
    } else {
      onInitiateTransfer(
        `Echo Agent ${agentNumber}`,
        `Agent: ${agentNumber}`,
        amountNum,
        'withdraw',
        `Cash Withdrawal via Agent ${agentNumber}`
      );
    }
  };

  // Calculations for current P2P inputs
  const parsedSendAmount = parseFloat(sendAmount) || 0;
  const currentSendFee = calculateEchoFee(parsedSendAmount);
  const currentSendTotal = parsedSendAmount + currentSendFee;

  // Comparison for calculator
  const comparison = getFeeComparison(calcAmount);

  // Filtered transactions
  const filteredTxs = transactions.filter(tx => {
    if (historyFilter !== 'all' && tx.type !== historyFilter) return false;
    if (searchHistory) {
      const q = searchHistory.toLowerCase();
      return (
        tx.recipientName.toLowerCase().includes(q) ||
        tx.recipientPhoneOrAccount.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Fee Advantage Banner - 2% Lower than Standard Rates & Free < 150 */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-600/40 text-white' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-emerald-300 text-slate-900 shadow-md'
      }`}>
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>EchoPay Fair Tariff Guarantee</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              2% Lower Than Standard Tariffs.
            </h2>
            <p className={`text-sm mt-1 max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Save more on every transaction. Micro-transactions under <span className="text-emerald-600 dark:text-emerald-300 font-bold">150 KSh</span> are <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">100% Free (0% fee)</span>. All amounts from 150 KSh and above are guaranteed <span className="text-emerald-600 dark:text-emerald-300 font-bold">2% cheaper</span> than standard market tariffs.
            </p>
          </div>

          {/* Quick Tariff Highlights */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
            <div className={`border rounded-2xl p-3.5 text-center transition-colors ${
              isDark ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-white/90 border-emerald-200 shadow-sm'
            }`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">Under 150 KSh</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">0% FREE</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">KSh 0.00 Fee</span>
            </div>
            <div className={`border rounded-2xl p-3.5 text-center transition-colors ${
              isDark ? 'bg-slate-900/90 border-teal-500/30' : 'bg-white/90 border-teal-200 shadow-sm'
            }`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">150 KSh & Above</span>
              <span className="text-2xl font-black text-teal-600 dark:text-teal-300">2% LESS</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Than Standard Tariff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {onOpenDeposit && (
          <button
            type="button"
            onClick={onOpenDeposit}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/30 shrink-0"
          >
            <Smartphone className="w-4 h-4 text-emerald-100" />
            <span>Top-Up via M-Pesa (Daraja STK)</span>
          </button>
        )}
        {onOpenReceive && (
          <button
            type="button"
            onClick={onOpenReceive}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-950/30 shrink-0"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
            <span>Receive via M-Pesa</span>
          </button>
        )}
        {onOpenWithdraw && (
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white shadow-md shadow-teal-950/30 shrink-0"
          >
            <ArrowDownToLine className="w-4 h-4 text-teal-100" />
            <span>Withdraw Cash / M-Pesa</span>
          </button>
        )}
        {onOpenMpesaInbox && (
          <button
            type="button"
            onClick={onOpenMpesaInbox}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-emerald-400 border border-emerald-500/30 shadow-md shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>M-Pesa Confirmation SMS</span>
          </button>
        )}
        {[
          { id: 'send', label: 'Send Money', icon: Send },
          { id: 'paybill', label: 'Lipa PayBill', icon: Receipt },
          { id: 'till', label: 'Buy Goods (Till)', icon: Store },
          { id: 'withdraw', label: 'Withdraw Cash', icon: ArrowDownToLine },
          { id: 'airtime', label: '5G Data & Airtime', icon: Smartphone },
          { id: 'calculator', label: 'Tariff Calculator', icon: Calculator },
          { id: 'security', label: 'PIN & Security', icon: KeyRound },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as typeof activeView)}
              className={`flex items-center space-x-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : isDark 
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Feature Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Operation Panel */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* VIEW: SEND MONEY */}
          {activeView === 'send' && (
            <div className={`border rounded-3xl p-6 shadow-xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between pb-4 border-b mb-5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Send className="w-4 h-4 text-emerald-500" />
                    <span>Send Money (P2P Transfer)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instant transfer to any Kenyan phone number</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenContacts}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Echo Contacts</span>
                </button>
              </div>

              {/* Quick Contact Chips */}
              <div className="mb-5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Recent Recipients</span>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {contacts.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContactForSend(c)}
                      className={`flex items-center space-x-2 p-1.5 pr-3 rounded-full border transition shrink-0 ${
                        sendPhone === c.phoneNumber
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-800 dark:text-white font-bold'
                          : isDark
                            ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-medium">{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendSubmit} className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Recipient Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 0722 418 902 or +254 711 839 204"
                      value={sendPhone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                    {sendName && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/40">
                        {sendName}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Amount (KSh)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      KSh
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 100, 150, 500, 2500"
                      min="1"
                      max={balance}
                      value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Live Realtime Fee Breakdown Card */}
                {parsedSendAmount > 0 && (
                  <div className={`p-4 rounded-2xl border space-y-2 text-xs transition-colors ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Transfer Amount</span>
                      <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        KSh {parsedSendAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">EchoLink Fee</span>
                      {parsedSendAmount < 150 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>KSh 0.00 (Zero Fee promotion &lt; 150 KSh)</span>
                        </span>
                      ) : (
                        <span className="text-teal-600 dark:text-teal-300 font-bold font-mono">
                          KSh {currentSendFee.toFixed(2)} (2% lower than standard)
                        </span>
                      )}
                    </div>
                    <div className={`border-t pt-2 flex justify-between items-center text-sm font-bold ${
                      isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                    }`}>
                      <span>Total debited from wallet:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        KSh {currentSendTotal.toFixed(2)}
                      </span>
                    </div>
                    {parsedSendAmount > balance && (
                      <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Insufficient wallet balance! (Current: KSh {balance.toFixed(2)}). You can use EchoFuliza Overdraft.</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Note / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lunch fare, Project advance, Rent"
                    value={sendNote}
                    onChange={e => setSendNote(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-2.5 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={parsedSendAmount <= 0 || parsedSendAmount > balance}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition transform active:scale-98 flex items-center justify-center space-x-2 ${
                    parsedSendAmount > 0 && parsedSendAmount <= balance
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                      : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Authorize Transfer & Enter PIN</span>
                </button>
              </form>
            </div>
          )}


          {/* VIEW: PAYBILL */}
          {activeView === 'paybill' && (
            <div className={`border rounded-3xl p-6 shadow-xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`pb-4 border-b mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>Lipa Na EchoLink (PayBill)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pay utility bills, government taxes, tuition, and internet</p>
              </div>

              {/* Popular Kenyan Billers */}
              <div className="mb-5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Popular Kenyan Billers</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_PAYBILLS.slice(0, 6).map(pb => (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => {
                        setSelectedPayBill(pb);
                        setCustomBizNo('');
                        setAccountNo(pb.defaultAccount || '');
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        selectedPayBill?.id === pb.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-900 dark:text-white font-bold'
                          : isDark
                            ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{pb.logoEmoji}</span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{pb.businessNumber}</span>
                      </div>
                      <span className="text-xs font-bold truncate">{pb.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handlePayBillSubmit} className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Business Number
                  </label>
                  <input
                    type="text"
                    value={selectedPayBill ? selectedPayBill.businessNumber : customBizNo}
                    onChange={e => {
                      setSelectedPayBill(null);
                      setCustomBizNo(e.target.value);
                    }}
                    placeholder="Enter 5-6 digit PayBill number"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={e => setAccountNo(e.target.value)}
                    placeholder={selectedPayBill ? selectedPayBill.accountPlaceholder : 'e.g. Meter No, Student ID, Invoice'}
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Amount (KSh)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      KSh
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 500, 1000, 2500"
                      min="1"
                      value={paybillAmount}
                      onChange={e => setPaybillAmount(e.target.value)}
                      className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!paybillAmount || parseFloat(paybillAmount) <= 0}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition shadow-lg shadow-emerald-950/40"
                >
                  Pay Bill via EchoPay (PIN Protected)
                </button>
              </form>
            </div>
          )}

          {/* VIEW: BUY GOODS (TILL) */}
          {activeView === 'till' && (
            <div className={`border rounded-3xl p-6 shadow-xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`pb-4 border-b mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span>Buy Goods & Services (Till Number)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pay supermarkets, fuel stations, pharmacies, and restaurants</p>
              </div>

              <form onSubmit={handleTillSubmit} className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Merchant Till Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 541902 (Java House) or 892019"
                    value={tillNumber}
                    onChange={e => setTillNumber(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Store / Merchant Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Naivas Supermarket, Total Westlands"
                    value={tillStoreName}
                    onChange={e => setTillStoreName(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Amount (KSh)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      KSh
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 120, 450, 1200"
                      min="1"
                      value={tillAmount}
                      onChange={e => setTillAmount(e.target.value)}
                      className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!tillAmount || parseFloat(tillAmount) <= 0}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition shadow-lg shadow-emerald-950/40"
                >
                  Pay Merchant Till (0% &lt; 150 KSh)
                </button>
              </form>
            </div>
          )}

          {/* VIEW: WITHDRAW CASH */}
          {activeView === 'withdraw' && (
            <div className={`border rounded-3xl p-6 shadow-xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`pb-4 border-b mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                    <span>Withdraw Cash & Payouts</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      2% Less Fee
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Disburse directly to Safaricom M-Pesa, cash agent, or cardless ATM
                  </p>
                </div>

                {onOpenWithdraw && (
                  <button
                    type="button"
                    onClick={onOpenWithdraw}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Open Interactive Wizard</span>
                  </button>
                )}
              </div>

              {/* Channel Selector Pills */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { id: 'mpesa', label: 'M-Pesa (B2C)', icon: Smartphone },
                  { id: 'agent', label: 'Agent', icon: Store },
                  { id: 'atm', label: 'Cardless ATM', icon: CreditCard },
                ].map(c => {
                  const Icon = c.icon;
                  const active = withdrawChannel === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setWithdrawChannel(c.id as typeof withdrawChannel)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-950/20'
                          : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                {withdrawChannel === 'mpesa' && (
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Recipient Safaricom Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0712 345 678 or 254..."
                      value={withdrawPhone}
                      onChange={e => setWithdrawPhone(e.target.value)}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Funds will be deposited to this Safaricom line instantly via Daraja B2C.
                    </p>
                  </div>
                )}

                {withdrawChannel === 'agent' && (
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Agent Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 291040 (EchoLink Agent)"
                      value={agentNumber}
                      onChange={e => setAgentNumber(e.target.value)}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                )}

                {withdrawChannel === 'atm' && (
                  <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Partner ATM Withdrawal (Cardless)
                    </p>
                    <p>
                      Supports Equity Bank, KCB, and Co-op Bank ATMs. Generates an instant 6-digit withdrawal voucher valid for 2 hours.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Withdrawal Amount (KSh)
                    </label>
                    <span className="text-[11px] text-emerald-500 font-bold">
                      Available: KSh {balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      KSh
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 500, 2000, 10000"
                      min="10"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className={`w-full border rounded-2xl pl-14 pr-4 py-3 text-base font-bold focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>

                  {/* Quick preset chips */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 scrollbar-none">
                    {[100, 200, 500, 1000, 2500].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setWithdrawAmount(String(p))}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition shrink-0 ${
                          parseFloat(withdrawAmount) === p
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

                <button
                  type="submit"
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-950/40"
                >
                  {parseFloat(withdrawAmount) > balance 
                    ? 'Insufficient Balance' 
                    : withdrawChannel === 'mpesa' 
                      ? 'Withdraw to M-Pesa (PIN Protected)' 
                      : withdrawChannel === 'atm'
                        ? 'Generate ATM Withdrawal Code'
                        : 'Generate Agent Withdrawal Voucher'}
                </button>
              </form>
            </div>
          )}

          {/* VIEW: DATA BUNDLES & AIRTIME */}
          {activeView === 'airtime' && (
            <div className={`border rounded-3xl p-6 shadow-xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`pb-4 border-b mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Smartphone className="w-4 h-4 text-teal-500" />
                  <span>EchoLink 5G Bundles & Voice Minutes</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Zero data expiry options, 5G VoLTE uncapped speeds</p>
              </div>

              <div className="space-y-3">
                {DATA_BUNDLES.map(bundle => (
                  <div
                    key={bundle.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800/80 hover:border-emerald-500/50' 
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{bundle.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-semibold border border-teal-500/30">
                          {bundle.validity}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        {bundle.volume} <span className="text-slate-500 dark:text-slate-400 font-normal font-sans">({bundle.bonus})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          KSh {bundle.priceKsh}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBuyBundle(bundle)}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/40"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CALCULATOR (ECHO LINK VS STANDARD MARKET TARIFFS) */}
          {activeView === 'calculator' && (
            <div className={`border rounded-3xl p-6 shadow-xl space-y-6 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Calculator className="w-4 h-4 text-emerald-500" />
                  <span>Live Fee Comparison: EchoLink vs Standard Market Tariffs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">See real-time savings based on Kenya telecom data</p>
              </div>

              {/* Slider & Number Input */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Transaction Amount:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">KSh {calcAmount.toLocaleString()}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="50"
                  max="15000"
                  step="50"
                  value={calcAmount}
                  onChange={e => setCalcAmount(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />

                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>50 KSh</span>
                  <span>150 KSh (0% Cutoff)</span>
                  <span>1,000 KSh</span>
                  <span>5,000 KSh</span>
                  <span>15,000 KSh</span>
                </div>
              </div>

              {/* Side-by-side comparison cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Echo Link */}
                <div className={`p-4 rounded-2xl border-2 flex flex-col justify-between ${
                  isDark 
                    ? 'bg-emerald-950/40 border-emerald-500/60' 
                    : 'bg-emerald-50/80 border-emerald-400'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">EchoLink</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        {calcAmount < 150 ? '0% Free' : '2% Less'}
                      </span>
                    </div>
                    <div className={`text-3xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      KSh {comparison.echoFee.toFixed(2)}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {calcAmount < 150 
                        ? '100% Free for amounts under 150 KSh!' 
                        : `Guaranteed 2% lower than standard tariff`}
                    </div>
                  </div>
                </div>

                {/* Standard Market Rates */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  isDark 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-slate-100 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Standard Market Rates</span>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        Tiered Tariff
                      </span>
                    </div>
                    <div className={`text-3xl font-black font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      KSh {comparison.standardFee.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Traditional carrier band charge
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings Announcement */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark 
                  ? 'bg-gradient-to-r from-emerald-900/60 to-teal-900/40 border-emerald-500/40' 
                  : 'bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-300'
              }`}>
                <div>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                    {comparison.difference > 0 ? 'You Save With EchoLink:' : 'Transparent Pricing:'}
                  </span>
                  <span className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {comparison.difference > 0 ? `KSh ${comparison.difference.toFixed(2)} (${comparison.savingsPercent}%)` : 'Simple & Predictable'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSendAmount(calcAmount.toString());
                    setActiveView('send');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  Send This Amount
                </button>
              </div>
            </div>
          )}

          {/* VIEW: PIN & SECURITY */}
          {activeView === 'security' && (
            <div className={`border rounded-3xl p-6 shadow-xl space-y-6 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between pb-4 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <KeyRound className="w-5 h-5 text-emerald-500" />
                    <span>PIN & Security Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage your EchoPay transaction authorization credentials</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    PIN Protection Active
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Your 4-digit EchoPay transaction PIN is secured via on-device encryption. It is required to approve all money transfers, PayBill payments, and ATM withdrawals.
                  </p>
                </div>
              </div>

              {/* Action Box */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Change Transaction PIN
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Update your PIN at any time. Requires verification of your current PIN or OTP reset via SMS or WhatsApp.
                  </p>
                </div>
                {onOpenChangePin && (
                  <button
                    type="button"
                    onClick={onOpenChangePin}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 shrink-0"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Change PIN Now</span>
                  </button>
                )}
              </div>

              {/* Security Best Practices */}
              <div className="space-y-2.5 pt-2">
                <h5 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Safety & Privacy Guidelines
                </h5>
                <div className={`space-y-2 text-xs p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Never share your PIN with anyone, including customer care or authorized agents.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>EchoLink will never initiate a phone call asking you to reveal your PIN.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>If you ever forget your PIN, you can reset it instantly with a one-time OTP delivered via SMS or WhatsApp.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Transaction History & Statement */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`border rounded-3xl p-5 shadow-xl flex flex-col h-full min-h-[500px] transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span>Transaction Statement</span>
              </h3>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {transactions.length} Total
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 py-3 overflow-x-auto text-[11px]">
              {(['all', 'send', 'receive', 'paybill', 'till', 'withdraw'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase capitalize transition ${
                    historyFilter === f
                      ? 'bg-emerald-600 text-white'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search filter */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ref, account..."
                value={searchHistory}
                onChange={e => setSearchHistory(e.target.value)}
                className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                }`}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
              {filteredTxs.map(tx => {
                const isIncoming = tx.type === 'receive';
                return (
                  <button
                    key={tx.id}
                    onClick={() => onSelectTransaction(tx)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between group ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950' 
                        : 'bg-slate-50/90 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isIncoming ? 'bg-emerald-500/20 text-emerald-500' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isIncoming ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="truncate max-w-[170px]">
                        <div className={`text-xs font-bold transition truncate group-hover:text-emerald-500 ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {tx.recipientName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {tx.timestamp}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: {tx.id} • Fee: KSh {tx.fee.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xs font-extrabold font-mono ${
                        isIncoming ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-slate-200' : 'text-slate-900'
                      }`}>
                        {isIncoming ? '+' : '-'}KSh {tx.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center justify-end space-x-1 mt-0.5">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tx.type}
                        </span>
                        {isIncoming && onViewMpesaSms && (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewMpesaSms(tx.id);
                            }}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition flex items-center gap-0.5 cursor-pointer"
                            title="View Safaricom M-Pesa Confirmation SMS"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>SMS</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredTxs.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No transactions found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
