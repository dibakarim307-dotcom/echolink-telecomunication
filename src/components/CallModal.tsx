import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Grid, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  X,
  Radio,
  Pause,
  Play,
  CircleDot,
  FileText,
  CornerDownLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { startRingbackTone, stopRingbackTone, playConnectedChime, playHangupTone, playDTMF } from '../utils/audio';
import { 
  setupMicAnalyser, 
  speakText, 
  stopSpeaking, 
  getInitialGreeting, 
  getConversationTopics, 
  fetchAiCallResponse,
  ConversationTopic,
  MicAnalyserHandle
} from '../utils/callVoiceService';

interface CallModalProps {
  name: string;
  phoneNumber: string;
  avatar?: string;
  onClose: (durationSec: number) => void;
  onOpenQuickSend: (recipientName: string, recipientPhone: string) => void;
}

interface TranscriptEntry {
  sender: 'user' | 'callee';
  text: string;
  time: string;
}

export const CallModal: React.FC<CallModalProps> = ({
  name,
  phoneNumber,
  avatar,
  onClose,
  onOpenQuickSend,
}) => {
  const [status, setStatus] = useState<'dialing' | 'ringing' | 'connected' | 'ended'>('dialing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [dtmfBuffer, setDtmfBuffer] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // Real mic capture and voice state
  const [hasRealMic, setHasRealMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isCalleeSpeaking, setIsCalleeSpeaking] = useState(false);
  const [calleeSubtitle, setCalleeSubtitle] = useState<string | null>(null);
  const [userLastSpoken, setUserLastSpoken] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(true);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const timerRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserHandleRef = useRef<MicAnalyserHandle | null>(null);
  const recognitionRef = useRef<any>(null);

  const isCustomerCare = name.toLowerCase().includes('care') || phoneNumber === '100' || phoneNumber.includes('*100');
  const topics: ConversationTopic[] = getConversationTopics(name);

  // Helper to format time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // 1. Initialize Real Microphone and Analyser
  useEffect(() => {
    let isCancelled = false;

    async function initMic() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          if (isCancelled) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          setHasRealMic(true);

          const analyser = setupMicAnalyser(stream);
          analyserHandleRef.current = analyser;

          // Animation loop reading real mic level
          const pollAudio = () => {
            if (isCancelled) return;
            const lvl = analyser.getLevel();
            setMicLevel(lvl);
            animFrameRef.current = requestAnimationFrame(pollAudio);
          };
          pollAudio();
        }
      } catch (err) {
        console.warn('Microphone permission not granted or unavailable, using voice presence simulation:', err);
        setHasRealMic(false);
        const simInterval = window.setInterval(() => {
          if (!isCancelled) {
            setMicLevel(Math.floor(20 + Math.random() * 45));
          }
        }, 150);
        return () => clearInterval(simInterval);
      }
    }

    initMic();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (analyserHandleRef.current) analyserHandleRef.current.cleanup();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Dialing & Ringing Cadence with Real Audio
  useEffect(() => {
    const dialTimer = setTimeout(() => {
      setStatus('ringing');
      startRingbackTone();
    }, 800);

    const answerTimer = setTimeout(() => {
      stopRingbackTone();
      playConnectedChime();
      setStatus('connected');

      // Callee speaks initial greeting!
      const greeting = getInitialGreeting(name);
      setCalleeSubtitle(greeting);
      setTranscript([
        { sender: 'callee', text: greeting, time: '00:00' }
      ]);
      setIsCalleeSpeaking(true);

      speakText(greeting, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
        gender: isCustomerCare ? 'female' : name.includes('David') || name.includes('Peter') || name.includes('John') ? 'male' : 'female'
      });
    }, 3000);

    return () => {
      clearTimeout(dialTimer);
      clearTimeout(answerTimer);
      stopRingbackTone();
      stopSpeaking();
    };
  }, [name, isCustomerCare]);

  // 3. Web Speech API Recognition for Live User Mic Transcription
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition && status === 'connected' && !isOnHold && !isMuted && !isCalleeSpeaking) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          if (transcriptText && transcriptText.trim().length > 1) {
            handleProcessUserInput(transcriptText.trim());
          }
        };

        recognition.onerror = () => {
          // ignore mic errors
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Recognition already active
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [status, isOnHold, isMuted, isCalleeSpeaking]);

  // Handle User Input (Spoken or Typed) with Gemini AI
  const handleProcessUserInput = async (text: string) => {
    if (!text.trim()) return;
    setUserLastSpoken(`"${text}"`);
    setIsThinking(true);

    const currentTime = formatTime(duration);
    setTranscript(prev => [...prev, { sender: 'user', text, time: currentTime }]);

    // Build history for context
    const historyPayload = transcript.slice(-6).map(t => ({
      role: (t.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: t.text,
    }));

    try {
      const response = await fetchAiCallResponse({
        calleeName: name,
        userMessage: text,
        history: historyPayload,
        isCustomerCare,
      });

      setIsThinking(false);
      setCalleeSubtitle(response);
      setTranscript(prev => [...prev, { sender: 'callee', text: response, time: formatTime(duration) }]);

      speakText(response, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
        gender: isCustomerCare ? 'female' : name.includes('David') || name.includes('Peter') || name.includes('John') ? 'male' : 'female'
      });
    } catch {
      setIsThinking(false);
      const fallback = "I hear you clearly! The EchoLink line is active with great reception.";
      setCalleeSubtitle(fallback);
      speakText(fallback, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    }
  };

  // Handle interactive topic button tap
  const handleSelectTopic = (topic: ConversationTopic) => {
    setActiveTopicId(topic.id);
    handleProcessUserInput(topic.userUtterance);
  };

  // Send custom typed utterance
  const handleSendCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const msg = customInput;
    setCustomInput('');
    handleProcessUserInput(msg);
  };

  // 4. Duration timer during connected call
  useEffect(() => {
    if (status === 'connected' && !isOnHold) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, isOnHold]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs(prev => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecordSecs(0);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // Handle Mute (Hardware mic mute)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Handle Speaker Toggle
  const toggleSpeaker = () => {
    setIsSpeaker(prev => !prev);
    playDTMF('2', 0.08);
  };

  // Handle Call Hold
  const toggleHold = () => {
    const nextHold = !isOnHold;
    setIsOnHold(nextHold);
    if (nextHold) {
      stopSpeaking();
      setCalleeSubtitle('Call placed on hold');
    } else {
      setCalleeSubtitle('Call resumed');
    }
    playDTMF('5', 0.1);
  };

  // Toggle Recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleHangup = () => {
    stopRingbackTone();
    stopSpeaking();
    playHangupTone();
    setStatus('ended');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setTimeout(() => {
      onClose(duration);
    }, 900);
  };

  const handleKeypadPress = (digit: string) => {
    playDTMF(digit);
    setDtmfBuffer(prev => prev + digit);

    // If IVR customer care call, respond to DTMF menu selections!
    if (isCustomerCare) {
      if (digit === '1') {
        const ivrMsg = "Your EchoLink airtime is 420 KSh. Data balance is 12.4 GB 5G active until end of month.";
        setCalleeSubtitle(ivrMsg);
        speakText(ivrMsg, { onStart: () => setIsCalleeSpeaking(true), onEnd: () => setIsCalleeSpeaking(false) });
      } else if (digit === '2') {
        const ivrMsg = "EchoLink 5G Bundles: Press 1 for Daily 1GB at 50 KSh, or Press 2 for Weekly 7GB at 250 KSh.";
        setCalleeSubtitle(ivrMsg);
        speakText(ivrMsg, { onStart: () => setIsCalleeSpeaking(true), onEnd: () => setIsCalleeSpeaking(false) });
      } else if (digit === '3') {
        const ivrMsg = "EchoPay features 0% transaction fees under 150 KSh and guaranteed 2% cheaper tariffs.";
        setCalleeSubtitle(ivrMsg);
        speakText(ivrMsg, { onStart: () => setIsCalleeSpeaking(true), onEnd: () => setIsCalleeSpeaking(false) });
      }
    }
  };

  // Compute live visual heights for the user's microphone bars
  const effectiveMicLevel = isMuted || isOnHold ? 0 : micLevel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative flex flex-col items-center text-slate-100 my-auto">
        
        {/* Top Telecom Indicator */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-semibold text-[11px]">
              {isCustomerCare ? 'EchoLink Care IVR' : 'EchoLink VoLTE HD'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
            {isRecording && (
              <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                <CircleDot className="w-3 h-3 text-rose-500" />
                <span>REC {formatTime(recordSecs)}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Opus 48kHz</span>
            </span>
          </div>
        </div>

        {/* Contact Avatar & Pulsing Rings */}
        <div className="relative my-2 sm:my-3 flex items-center justify-center">
          {status === 'connected' && isCalleeSpeaking && (
            <div 
              className="absolute w-36 h-36 rounded-full bg-emerald-500/25 animate-ping"
              style={{ animationDuration: '1.6s' }}
            />
          )}
          {status === 'connected' && !isCalleeSpeaking && (
            <div 
              className="absolute w-32 h-32 rounded-full bg-teal-500/15 animate-pulse"
            />
          )}
          {status === 'ringing' && (
            <div className="absolute w-32 h-32 rounded-full bg-indigo-500/25 animate-pulse" />
          )}

          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr ${
            isCalleeSpeaking ? 'from-emerald-400 to-teal-300 ring-4 ring-emerald-500/40' : 'from-emerald-500 to-teal-500'
          } shadow-xl relative z-10 transition-all duration-300`}>
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-emerald-400">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight text-center mt-1">
          {name}
        </h2>
        <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">
          {phoneNumber}
        </p>

        {/* Call Status & Live Timer */}
        <div className="mt-2 mb-3 flex flex-col items-center">
          {status === 'dialing' && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 animate-pulse flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Routing 5G Carrier Network...</span>
            </span>
          )}
          {status === 'ringing' && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Ringing...</span>
            </span>
          )}
          {status === 'connected' && (
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                  {formatTime(duration)}
                </span>
                {isOnHold ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    On Hold
                  </span>
                ) : isCalleeSpeaking ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    <span>Speaking</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    <span>Listening</span>
                  </span>
                )}
              </div>
            </div>
          )}
          {status === 'ended' && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              Call Ended
            </span>
          )}
        </div>

        {/* REAL DUAL AUDIO WAVEFORM VISUALIZER */}
        {status === 'connected' && (
          <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2.5 mb-2.5 space-y-1.5">
            {/* Caller Real Microphone Level */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span className="flex items-center gap-1">
                <Mic className={`w-3 h-3 ${isMuted ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>{isMuted ? 'Mic Muted' : hasRealMic ? 'Live Mic Input' : 'Microphone (Active)'}</span>
              </span>
              <span className="text-[9px] text-slate-500">
                {isMuted ? 'OFF' : `${effectiveMicLevel}%`}
              </span>
            </div>
            
            {/* Real Mic Equalizer Bars */}
            <div className="flex items-center justify-center space-x-1 h-5">
              {[25, 60, 95, 45, 80, 100, 75, 40, 90, 65, 35].map((factor, i) => {
                const barHeight = Math.max(3, (factor * effectiveMicLevel) / 100 * 0.2);
                return (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isMuted ? 'bg-slate-700 h-1' : 'bg-emerald-400'
                    }`}
                    style={{
                      height: `${barHeight}px`,
                      opacity: isMuted ? 0.3 : Math.min(1, 0.4 + (effectiveMicLevel / 100)),
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* REAL LIVE CALLEE SUBTITLE / SPEECH BUBBLE */}
        {status === 'connected' && calleeSubtitle && (
          <div className={`w-full mb-2.5 p-3 rounded-2xl border transition-all text-left ${
            isCalleeSpeaking 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-sm' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <Volume2 className="w-3 h-3" />
                <span>{name} (Live Voice)</span>
              </span>
              {isCalleeSpeaking && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 animate-pulse">
                  VoLTE Speech Active
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed font-sans">
              "{calleeSubtitle}"
            </p>
          </div>
        )}

        {/* User Last Spoken or Thinking Indicator */}
        {status === 'connected' && (
          <div className="w-full mb-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
            {isThinking ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3" />
                <span>{name.split(' ')[0]} is thinking...</span>
              </span>
            ) : userLastSpoken ? (
              <span className="italic truncate max-w-[200px]">
                You: {userLastSpoken}
              </span>
            ) : (
              <span>Speak into mic or type below</span>
            )}
            
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-emerald-400 hover:underline flex items-center gap-0.5 ml-auto text-[10px]"
            >
              <FileText className="w-3 h-3" />
              <span>Transcript ({transcript.length})</span>
            </button>
          </div>
        )}

        {/* Live Call Transcript Modal Drawer */}
        {showTranscript && (
          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-2.5 max-h-40 overflow-y-auto space-y-1.5 text-xs text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] font-bold text-slate-400 uppercase">
              <span>Real-Time Conversation Log</span>
              <button onClick={() => setShowTranscript(false)} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            {transcript.map((item, idx) => (
              <div key={idx} className={`p-1.5 rounded-lg text-[11px] ${
                item.sender === 'user' ? 'bg-slate-800 text-slate-200 ml-3' : 'bg-emerald-950/40 text-emerald-200 mr-3'
              }`}>
                <div className="flex justify-between text-[9px] opacity-70 mb-0.5">
                  <span>{item.sender === 'user' ? 'You' : name}</span>
                  <span>{item.time}</span>
                </div>
                <div>{item.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* TALK / TYPE PROMPT BAR (Gemini Conversational Response) */}
        {status === 'connected' && (
          <form onSubmit={handleSendCustomText} className="w-full mb-2.5 flex items-center space-x-1.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={`Say something to ${name.split(' ')[0]}...`}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customInput.trim() || isThinking}
              className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition active:scale-95 shrink-0"
              title="Speak or Send"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* QUICK CONVERSATION TOPIC CHIPS */}
        {status === 'connected' && (
          <div className="w-full mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Quick Voice Prompts:</span>
              </span>
              <button 
                onClick={() => setShowTopics(!showTopics)} 
                className="text-[10px] text-emerald-400 hover:underline flex items-center"
              >
                {showTopics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showTopics && (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTopic(t)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition active:scale-95 text-left ${
                      activeTopicId === t.id
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {t.userLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* In-Call Quick EchoPay Transfer */}
        {status === 'connected' && (
          <button
            onClick={() => onOpenQuickSend(name, phoneNumber)}
            className="w-full mb-3.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition transform active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Money on EchoPay (0% fee &lt; 150)</span>
          </button>
        )}

        {/* In-Call Keypad Overlay if active */}
        {showKeypad && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-3">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-xs text-slate-400 font-mono">
                DTMF: {dtmfBuffer || 'Dial digits...'}
              </span>
              <button 
                onClick={() => setShowKeypad(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleKeypadPress(d)}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white font-mono active:bg-emerald-600 transition"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons Grid */}
        <div className="grid grid-cols-5 gap-1.5 w-full mb-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            disabled={status !== 'connected'}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition ${
              isMuted 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
            } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4 mb-1" /> : <Mic className="w-4 h-4 mb-1" />}
            <span className="text-[10px] font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            disabled={status !== 'connected'}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition ${
              isSpeaker 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
            } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Toggle Speakerphone / Earpiece"
          >
            {isSpeaker ? <Volume2 className="w-4 h-4 mb-1" /> : <VolumeX className="w-4 h-4 mb-1" />}
            <span className="text-[10px] font-medium">{isSpeaker ? 'Speaker' : 'Earpiece'}</span>
          </button>

          {/* Record Button */}
          <button
            onClick={toggleRecording}
            disabled={status !== 'connected'}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition ${
              isRecording 
                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/50' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
            } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop Recording' : 'Record Audio'}
          >
            <CircleDot className={`w-4 h-4 mb-1 ${isRecording ? 'animate-pulse text-rose-400' : ''}`} />
            <span className="text-[10px] font-medium">{isRecording ? 'Rec' : 'Record'}</span>
          </button>

          {/* Hold Button */}
          <button
            onClick={toggleHold}
            disabled={status !== 'connected'}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition ${
              isOnHold 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
            } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isOnHold ? 'Resume Call' : 'Hold Call'}
          >
            {isOnHold ? <Play className="w-4 h-4 mb-1" /> : <Pause className="w-4 h-4 mb-1" />}
            <span className="text-[10px] font-medium">{isOnHold ? 'Resume' : 'Hold'}</span>
          </button>

          {/* Keypad Button */}
          <button
            onClick={() => setShowKeypad(!showKeypad)}
            disabled={status !== 'connected'}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition ${
              showKeypad 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
            } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Open DTMF Keypad"
          >
            <Grid className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium">Keypad</span>
          </button>
        </div>

        {/* End Call Button */}
        <button
          onClick={handleHangup}
          className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 transition transform"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
