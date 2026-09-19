import React, { useState } from 'react';
import { 
  Phone, 
  Video, 
  Delete, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  Star, 
  Hash, 
  UserPlus, 
  Sparkles, 
  Users, 
  Search,
  Activity,
  Radio
} from 'lucide-react';
import { Contact, CallRecord } from '../types';
import { playDTMF } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';

interface DialerTabProps {
  contacts: Contact[];
  callHistory: CallRecord[];
  onStartCall: (name: string, phone: string, type: 'voice' | 'video') => void;
  onOpenContacts: () => void;
  onOpenUSSD: (code: string) => void;
  onSimulateIncomingCall?: (callerName?: string, phone?: string, type?: 'voice' | 'video') => void;
}

export const DialerTab: React.FC<DialerTabProps> = ({
  contacts,
  callHistory,
  onStartCall,
  onOpenContacts,
  onOpenUSSD,
  onSimulateIncomingCall,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [dialNumber, setDialNumber] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'keypad' | 'history'>('keypad');

  const handleKeyPress = (digit: string) => {
    playDTMF(digit);
    setDialNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialNumber('');
  };

  const handleInitiateCall = (type: 'voice' | 'video') => {
    if (!dialNumber.trim()) return;

    // Check if dialNumber is a USSD code like *144#
    if (dialNumber.startsWith('*') && dialNumber.endsWith('#')) {
      onOpenUSSD(dialNumber);
      return;
    }

    if (dialNumber.trim() === '100') {
      onStartCall('EchoLink Customer Care', '100', type);
      return;
    }

    // Look up contact name or fallback to number
    const matchedContact = contacts.find(
      c => c.phoneNumber.replace(/\s+/g, '') === dialNumber.replace(/\s+/g, '')
    );
    const callerName = matchedContact ? matchedContact.name : `+254 ${dialNumber.replace(/^\+?254/, '')}`;

    onStartCall(callerName, dialNumber, type);
  };

  const keypadKeys = [
    { key: '1', sub: 'VOICEMAIL' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
    { key: '*', sub: 'USSD' },
    { key: '0', sub: '+' },
    { key: '#', sub: 'HASH' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Toggle Pills */}
      <div className={`flex items-center justify-between p-1.5 rounded-2xl border max-w-md mx-auto transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => setActiveSubTab('keypad')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeSubTab === 'keypad'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Smart Dialer</span>
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeSubTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Call History ({callHistory.length})</span>
        </button>
      </div>

      {activeSubTab === 'keypad' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start max-w-3xl mx-auto">
          
          {/* Dialer Keypad Column */}
          <div className={`md:col-span-7 border rounded-3xl p-6 shadow-xl flex flex-col items-center transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Number Input Display */}
            <div className="w-full flex flex-col items-center mb-6">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mb-1 font-semibold">
                <span>🇰🇪 Kenya (+254)</span>
                {dialNumber.startsWith('*') && <span className="text-amber-500">• USSD Mode</span>}
              </div>
              <div className="h-14 flex items-center justify-center w-full px-2">
                <input
                  type="text"
                  value={dialNumber}
                  onChange={e => setDialNumber(e.target.value)}
                  placeholder="07XX XXX XXX or *144#"
                  className={`w-full text-center text-3xl sm:text-4xl font-mono font-extrabold tracking-wider bg-transparent focus:outline-none ${
                    isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Sub-label showing matched contact */}
              {dialNumber && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[260px]">
                  {contacts.find(c => c.phoneNumber.replace(/\s+/g, '') === dialNumber.replace(/\s+/g, ''))?.name ||
                    (dialNumber.startsWith('*') ? 'Quick USSD Command' : 'EchoLink VoLTE HD Ready')}
                </div>
              )}
            </div>

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] mb-6">
              {keypadKeys.map(({ key, sub }) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`h-16 rounded-2xl active:scale-95 border flex flex-col items-center justify-center transition shadow-sm group ${
                    isDark 
                      ? 'bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600/40 border-slate-700/50 text-white' 
                      : 'bg-slate-50 hover:bg-slate-100 active:bg-emerald-100 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className={`text-2xl font-bold font-mono group-hover:text-emerald-500 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {key}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                    {sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Action Bar (Backspace, Call, Video Call, Contacts) */}
            <div className="flex items-center justify-center space-x-4 w-full max-w-[300px]">
              {/* Directory trigger */}
              <button
                onClick={onOpenContacts}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center transition border ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
                }`}
                title="Open Contacts Directory"
              >
                <Users className="w-5 h-5" />
              </button>

              {/* Voice Call Button */}
              <button
                onClick={() => handleInitiateCall('voice')}
                disabled={!dialNumber}
                className={`flex-1 h-14 rounded-2xl flex items-center justify-center space-x-2 font-bold text-sm text-white shadow-lg transition transform active:scale-95 ${
                  dialNumber
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Start Voice Call"
              >
                <Phone className="w-5 h-5" />
                <span>Call</span>
              </button>

              {/* Video Call Button */}
              <button
                onClick={() => handleInitiateCall('video')}
                disabled={!dialNumber || dialNumber.startsWith('*')}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center transition transform active:scale-95 ${
                  dialNumber && !dialNumber.startsWith('*')
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                    : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Start 1080p Video Call"
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Backspace Button */}
              {dialNumber && (
                <button
                  onClick={handleBackspace}
                  className={`w-13 h-13 rounded-2xl flex items-center justify-center transition border ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
                  }`}
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Contacts & USSD Shortcuts Column */}
          <div className="md:col-span-5 space-y-4">
            {/* Real Connected Voice & Audio Feature Card */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark 
                ? 'bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900 border-emerald-500/30' 
                : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200 shadow-sm'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Real Connected Voice & Audio (Gemini AI)
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Live microphone analysis • Real AI voice replies • VoLTE HD
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => {
                    const target = contacts[0] || { name: 'Sarah Chebet', phoneNumber: '+254 712 345 678' };
                    onStartCall(target.name, target.phoneNumber, 'voice');
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-md shadow-emerald-950/30 transition transform active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Sarah (VoLTE)</span>
                </button>

                {onSimulateIncomingCall && (
                  <button
                    onClick={() => {
                      const target = contacts[0] || { name: 'Sarah Chebet', phoneNumber: '+254 712 345 678' };
                      onSimulateIncomingCall(target.name, target.phoneNumber, 'voice');
                    }}
                    className="py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-md shadow-teal-950/30 transition transform active:scale-95"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Receive Incoming Call</span>
                  </button>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => onStartCall('EchoLink Customer Care', '100', 'voice')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>🎧 Call Telecom Customer Care IVR (100)</span>
                </button>
                <span className="text-[10px] text-slate-500">Toll Free</span>
              </div>
            </div>

            {/* Speed Dial / Favorites */}
            <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Speed Dial Favorites
                </h3>
                <button
                  onClick={onOpenContacts}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2">
                {contacts.slice(0, 4).map(contact => (
                  <div
                    key={contact.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between transition ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{contact.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{contact.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onStartCall(contact.name, contact.phoneNumber, 'voice')}
                        className={`p-2 rounded-xl transition ${
                          isDark 
                            ? 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white' 
                            : 'bg-slate-200 hover:bg-emerald-600 text-slate-700 hover:text-white'
                        }`}
                        title="Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onStartCall(contact.name, contact.phoneNumber, 'video')}
                        className={`p-2 rounded-xl transition ${
                          isDark 
                            ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white' 
                            : 'bg-slate-200 hover:bg-indigo-600 text-slate-700 hover:text-white'
                        }`}
                        title="Video Call"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* USSD Telecom Quick Dialers */}
            <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                <Hash className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                EchoLink Telecom USSD Codes
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOpenUSSD('*144#')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isDark 
                      ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-800' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">*144#</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Account & Balances</div>
                </button>
                <button
                  onClick={() => onOpenUSSD('*544#')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isDark 
                      ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-800' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">*544#</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">5G Bundles & Mins</div>
                </button>
                <button
                  onClick={() => onOpenUSSD('*334#')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isDark 
                      ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-800' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">*334#</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">EchoPay Mobile Money</div>
                </button>
                <button
                  onClick={() => onOpenUSSD('*100#')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isDark 
                      ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-800' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">*100#</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Self-Care & VoLTE</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Call History Tab */
        <div className={`max-w-2xl mx-auto border rounded-3xl p-5 shadow-xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Recent Telecom Calls</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">VoLTE & VoNR Active</span>
          </div>

          <div className="space-y-2.5">
            {callHistory.map(call => (
              <div
                key={call.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  isDark 
                    ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-200/80'}`}>
                    {call.direction === 'incoming' && <PhoneIncoming className="w-4 h-4 text-emerald-500" />}
                    {call.direction === 'outgoing' && <PhoneOutgoing className="w-4 h-4 text-blue-500" />}
                    {call.direction === 'missed' && <PhoneMissed className="w-4 h-4 text-rose-500" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{call.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {call.type}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {call.phoneNumber} • {call.timestamp}
                    </div>
                    {call.durationSeconds > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Duration: {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onStartCall(call.name, call.phoneNumber, call.type)}
                    className={`p-2 rounded-xl transition ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white' 
                        : 'bg-slate-200 hover:bg-emerald-600 text-slate-700 hover:text-white'
                    }`}
                    title={`Call back with ${call.type}`}
                  >
                    {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

};
