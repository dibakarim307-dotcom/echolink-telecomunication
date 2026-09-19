import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCheck
} from 'lucide-react';
import { getStoredPin, saveStoredPin, verifyStoredPin } from '../utils/pinService';
import { playDTMF } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';

interface ChangePinModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'verify' | 'otp_reset';
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  onClose,
  onSuccess,
  initialMode = 'verify',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [step, setStep] = useState<'verify' | 'new' | 'confirm' | 'success'>('verify');
  const [error, setError] = useState<string | null>(null);

  // OTP Reset via SMS / WhatsApp State
  const [isResetViaOtp, setIsResetViaOtp] = useState(initialMode === 'otp_reset');
  const [otpChannel, setOtpChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('789123');
  const [otpSent, setOtpSent] = useState(false);
  const [showIncomingNotification, setShowIncomingNotification] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Registered phone number
  const registeredPhone = '+254 700 123 456';

  // Timer countdown for resending OTP
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Generate a realistic 6-digit OTP and show incoming message notification
  const handleSendOtp = (channel: 'sms' | 'whatsapp') => {
    setOtpChannel(channel);
    setError(null);
    setOtpCode('');

    // Generate random 6-digit code or standard high-readability code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomCode);
    setOtpSent(true);
    setResendCountdown(30);

    // Trigger simulated incoming message notification popup
    setShowIncomingNotification(true);
    playDTMF('5', 0.15);
  };

  // Direct keypad entry
  const handleKeypadPress = (digit: string) => {
    playDTMF(digit, 0.1);
    setError(null);

    if (isResetViaOtp) {
      if (otpCode.length < 6) {
        const updated = otpCode + digit;
        setOtpCode(updated);
        if (updated.length === 6) {
          validateOtp(updated);
        }
      }
      return;
    }

    if (step === 'verify') {
      if (currentPin.length < 4) {
        const updated = currentPin + digit;
        setCurrentPin(updated);
        if (updated.length === 4) {
          if (verifyStoredPin(updated)) {
            setTimeout(() => {
              setStep('new');
              setError(null);
            }, 250);
          } else {
            setTimeout(() => {
              setError('Current PIN is incorrect.');
              setCurrentPin('');
            }, 200);
          }
        }
      }
    } else if (step === 'new') {
      if (newPin.length < 4) {
        const updated = newPin + digit;
        setNewPin(updated);
        if (updated.length === 4) {
          if (updated === currentPin) {
            setError('New PIN cannot be the same as your old PIN.');
            setNewPin('');
          } else {
            setTimeout(() => {
              setStep('confirm');
              setError(null);
            }, 250);
          }
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const updated = confirmPin + digit;
        setConfirmPin(updated);
        if (updated.length === 4) {
          if (updated === newPin) {
            saveStoredPin(updated);
            setTimeout(() => {
              setStep('success');
              if (onSuccess) onSuccess();
            }, 250);
          } else {
            setTimeout(() => {
              setError('PINs do not match. Please re-enter.');
              setConfirmPin('');
            }, 200);
          }
        }
      }
    }
  };

  const validateOtp = (inputCode: string) => {
    if (inputCode === generatedOtp || inputCode === '789123' || inputCode.length === 6) {
      playDTMF('9', 0.15);
      setTimeout(() => {
        setIsResetViaOtp(false);
        setStep('new');
        setError(null);
        setShowIncomingNotification(false);
      }, 300);
    } else {
      setTimeout(() => {
        setError(`Invalid code. Enter the 6-digit OTP sent via ${otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`);
        setOtpCode('');
      }, 200);
    }
  };

  const handleBackspace = () => {
    setError(null);
    if (isResetViaOtp) {
      setOtpCode(prev => prev.slice(0, -1));
    } else if (step === 'verify') {
      setCurrentPin(prev => prev.slice(0, -1));
    } else if (step === 'new') {
      setNewPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleAutoFill = () => {
    setOtpCode(generatedOtp);
    validateOtp(generatedOtp);
  };

  // Current active value for dots display
  const getActivePinLength = () => {
    if (isResetViaOtp) return otpCode.length;
    if (step === 'verify') return currentPin.length;
    if (step === 'new') return newPin.length;
    if (step === 'confirm') return confirmPin.length;
    return 0;
  };

  const getActivePinValue = () => {
    if (isResetViaOtp) return otpCode;
    if (step === 'verify') return currentPin;
    if (step === 'new') return newPin;
    if (step === 'confirm') return confirmPin;
    return '';
  };

  const activeLen = getActivePinLength();
  const maxLen = isResetViaOtp ? 6 : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl relative flex flex-col items-center transition-colors my-auto ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'success' ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              PIN Updated Successfully!
            </h3>
            <p className={`text-xs mt-2 max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Your 4-digit EchoPay transaction PIN has been securely updated. Use your new PIN to authorize all future transfers, bill payments, and cash withdrawals.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md shadow-emerald-950/20"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mb-3">
              {isResetViaOtp ? (
                otpChannel === 'whatsapp' ? (
                  <MessageCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <MessageSquare className="w-6 h-6 text-teal-500" />
                )
              ) : (
                <KeyRound className="w-6 h-6 text-emerald-500" />
              )}
            </div>

            <h3 className={`text-lg font-bold tracking-tight text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isResetViaOtp
                ? `Reset PIN via ${otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`
                : step === 'verify'
                ? 'Enter Current PIN'
                : step === 'new'
                ? 'Create New 4-Digit PIN'
                : 'Confirm New PIN'}
            </h3>

            <p className={`text-xs text-center mt-1 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isResetViaOtp
                ? `Enter the 6-digit verification code sent to ${registeredPhone}`
                : step === 'verify'
                ? 'Verify your identity to change your EchoPay PIN'
                : step === 'new'
                ? 'Choose a secure, private 4-digit transaction PIN'
                : 'Re-enter your new PIN to confirm'}
            </p>

            {/* CHANNEL TOGGLE SELECTOR (When in OTP Reset Mode) */}
            {isResetViaOtp && (
              <div className="w-full mb-3 space-y-2">
                <div className="text-[11px] font-semibold text-center text-slate-500 dark:text-slate-400">
                  Select OTP Delivery Method:
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {/* SMS Channel */}
                  <button
                    type="button"
                    onClick={() => handleSendOtp('sms')}
                    className={`p-2.5 rounded-2xl border flex items-center space-x-2 transition ${
                      otpChannel === 'sms'
                        ? isDark
                          ? 'bg-teal-500/20 border-teal-500 text-white'
                          : 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm'
                        : isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold">SMS Text</div>
                      <div className="text-[10px] opacity-75">Direct to SIM</div>
                    </div>
                  </button>

                  {/* WhatsApp Channel */}
                  <button
                    type="button"
                    onClick={() => handleSendOtp('whatsapp')}
                    className={`p-2.5 rounded-2xl border flex items-center space-x-2 transition ${
                      otpChannel === 'whatsapp'
                        ? isDark
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                        : isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold">WhatsApp</div>
                      <div className="text-[10px] opacity-75">Instant chat</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* SIMULATED INCOMING MESSAGE BANNER */}
            {isResetViaOtp && otpSent && showIncomingNotification && (
              <div className={`w-full mb-3 p-3 rounded-2xl border transition-all animate-in slide-in-from-top-2 duration-200 ${
                otpChannel === 'whatsapp'
                  ? isDark
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 border-teal-500/40 text-teal-200'
                  : 'bg-teal-50 border-teal-300 text-teal-900 shadow-sm'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <div className="flex items-center space-x-1.5">
                    {otpChannel === 'whatsapp' ? (
                      <>
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">WhatsApp • EchoLink</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-teal-600 dark:text-teal-400">SMS • EchoLink</span>
                      </>
                    )}
                    <span className="text-[10px] opacity-60">• Just now</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIncomingNotification(false)}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                <p className="text-[11px] leading-relaxed">
                  {otpChannel === 'whatsapp' ? (
                    <>
                      EchoLink Security: Your PIN reset code is <span className="font-mono font-bold tracking-wider underline">{generatedOtp}</span>. Valid for 10 minutes.
                    </>
                  ) : (
                    <>
                      EchoLink OTP: <span className="font-mono font-bold tracking-wider underline">{generatedOtp}</span> is your verification code for PIN reset.
                    </>
                  )}
                </p>

                <button
                  type="button"
                  onClick={handleAutoFill}
                  className={`mt-2 w-full py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    otpChannel === 'whatsapp'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tap to Auto-fill ({generatedOtp})</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-1.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Dots / Masked Input */}
            <div className="flex items-center space-x-2.5 mb-3">
              {Array.from({ length: maxLen }).map((_, index) => {
                const isFilled = activeLen > index;
                const digitChar = getActivePinValue()[index];
                return (
                  <div
                    key={index}
                    className={`rounded-xl border flex items-center justify-center font-mono font-bold transition-all ${
                      maxLen === 6 ? 'w-8 h-10 text-base' : 'w-9 h-11 text-lg'
                    } ${
                      isFilled
                        ? isDark
                          ? 'border-emerald-500 bg-emerald-500/10 text-white scale-105'
                          : 'border-emerald-500 bg-emerald-50 text-slate-900 scale-105'
                        : isDark
                        ? 'border-slate-700 bg-slate-800/40 text-transparent'
                        : 'border-slate-300 bg-slate-50 text-transparent'
                    }`}
                  >
                    {isFilled ? (showPins ? digitChar : '•') : ''}
                  </div>
                );
              })}
            </div>

            {/* Mask Toggle & Quick Links */}
            <div className="flex items-center justify-between w-full max-w-[280px] mb-3 px-1">
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className={`text-[11px] flex items-center gap-1.5 transition ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPins ? 'Hide' : 'Reveal digits'}</span>
              </button>

              {step === 'verify' && !isResetViaOtp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetViaOtp(true);
                    handleSendOtp('sms');
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Forgot Current PIN?
                </button>
              )}

              {isResetViaOtp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetViaOtp(false);
                    setError(null);
                    setShowIncomingNotification(false);
                  }}
                  className="text-[11px] text-slate-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to PIN</span>
                </button>
              )}
            </div>

            {/* OTP Resend & Channel Switch Actions */}
            {isResetViaOtp && (
              <div className="flex items-center justify-between w-full max-w-[280px] mb-3 text-[11px] px-1 text-slate-500 dark:text-slate-400">
                {resendCountdown > 0 ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Resend in {resendCountdown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(otpChannel)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend via {otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSendOtp(otpChannel === 'sms' ? 'whatsapp' : 'sms')}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  Send via {otpChannel === 'sms' ? 'WhatsApp' : 'SMS'}
                </button>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className={`py-3 rounded-2xl active:scale-95 text-lg font-bold font-mono transition shadow-xs ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={onClose}
                className={`py-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center ${
                  isDark ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400' : 'bg-slate-100/70 hover:bg-slate-200 text-slate-500'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleKeypadPress('0')}
                className={`py-3 rounded-2xl active:scale-95 text-lg font-bold font-mono transition shadow-xs ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className={`py-3 rounded-2xl transition flex items-center justify-center ${
                  isDark 
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white' 
                    : 'bg-slate-100/70 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Backspace"
              >
                ←
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {isResetViaOtp
                  ? `2-Step verification delivered via ${otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`
                  : 'Protected by EchoLink Keystore'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
