import React, { useState } from 'react';
import { Hash, X, CornerDownLeft, Sparkles, PhoneCall } from 'lucide-react';
import { USSD_DATABASE } from '../data/mockData';
import { USSDMenu } from '../types';
import { useTheme } from '../context/ThemeContext';

interface USSDModalProps {
  initialCode?: string;
  onClose: () => void;
  onExecutePayAction?: (action: string) => void;
}

export const USSDModal: React.FC<USSDModalProps> = ({
  initialCode = '*144#',
  onClose,
  onExecutePayAction,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentMenu, setCurrentMenu] = useState<USSDMenu>(
    USSD_DATABASE[initialCode] || {
      code: initialCode,
      title: 'EchoLink USSD Service',
      prompt: `Connected to ${initialCode}.\nService operational.\nEchoLink 5G Core IMS registered.`,
      isTerminal: true,
    }
  );
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const trimmed = inputVal.trim();
    // Check options
    const match = currentMenu.options?.find(o => o.key === trimmed);
    if (match) {
      if (match.responseMessage) {
        setStatusMessage(match.responseMessage);
      }
      setHistory(prev => [...prev, `${trimmed} -> ${match.label}`]);
    } else {
      setStatusMessage(`Invalid choice "${trimmed}". Please select a valid option from the menu.`);
    }
    setInputVal('');
  };

  const handleDialCode = (code: string) => {
    if (USSD_DATABASE[code]) {
      setCurrentMenu(USSD_DATABASE[code]);
      setStatusMessage(null);
      setHistory([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-sm border-2 rounded-3xl p-5 shadow-2xl relative font-mono transition-colors ${
        isDark 
          ? 'bg-slate-900 border-emerald-500/40 text-slate-100' 
          : 'bg-white border-emerald-500/50 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <Hash className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">
              USSD Service: {currentMenu.code}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick USSD Switcher Buttons */}
        <div className="flex flex-wrap gap-1.5 mb-3 font-sans text-xs">
          {['*144#', '*544#', '*334#', '*100#'].map(code => (
            <button
              key={code}
              onClick={() => handleDialCode(code)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono transition ${
                currentMenu.code === code
                  ? 'bg-emerald-600 text-white font-bold'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* USSD Prompt Display (Authentic Kenyan Telecom Screen) */}
        <div className={`p-4 rounded-2xl border min-h-[140px] text-xs leading-relaxed whitespace-pre-line shadow-inner mb-4 ${
          isDark 
            ? 'bg-slate-950 border-slate-800 text-slate-200' 
            : 'bg-slate-900 border-slate-800 text-emerald-400'
        }`}>
          <div className="text-emerald-400 font-bold mb-1 font-sans">
            {currentMenu.title}
          </div>
          {statusMessage || currentMenu.prompt}
        </div>

        {/* Response Input or Dismiss */}
        {!currentMenu.isTerminal && !statusMessage ? (
          <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Enter number (e.g. 1)"
              autoFocus
              className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-sans text-xs font-bold rounded-xl flex items-center gap-1 transition"
            >
              <span>Send</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex justify-end gap-2 mb-2 font-sans">
            {statusMessage && (
              <button
                onClick={() => setStatusMessage(null)}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Back to Menu
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
            >
              OK
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-500 text-center font-sans mt-2">
          EchoLink Telecom Interactive Session • Zero Cost
        </div>
      </div>
    </div>
  );
};
