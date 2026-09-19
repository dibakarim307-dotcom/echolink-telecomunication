import React from 'react';
import { MessageSquare, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { MpesaSmsMessage } from '../types';

interface MpesaPushBannerProps {
  message: MpesaSmsMessage | null;
  onViewDetails?: (message: MpesaSmsMessage) => void;
  onOpenModal?: () => void;
  onDismiss: () => void;
}

export const MpesaPushBanner: React.FC<MpesaPushBannerProps> = ({
  message,
  onViewDetails,
  onOpenModal,
  onDismiss,
}) => {
  if (!message) return null;

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(message);
    } else if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
      <div 
        onClick={handleClick}
        className="cursor-pointer bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-white rounded-2xl p-3.5 shadow-2xl hover:border-emerald-400 transition-all group flex items-start space-x-3 relative"
      >
        {/* M-Pesa Icon Badge */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40 mt-0.5">
          MP
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider">
              M-PESA
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-400">• Just now</span>
          </div>

          <p className="text-xs font-mono font-medium text-slate-200 line-clamp-2 mt-0.5">
            {message.messageText}
          </p>

          <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 mt-1 group-hover:underline">
            <span>Tap to view full Safaricom SMS</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
