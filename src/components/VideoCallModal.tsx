import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  SwitchCamera, 
  Share2, 
  Send, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Smile, 
  Sparkles,
  Camera,
  Activity,
  Volume2,
  Radio,
  MessageCircle,
  X
} from 'lucide-react';
import { startRingbackTone, stopRingbackTone, playConnectedChime, playHangupTone } from '../utils/audio';
import { 
  speakText, 
  stopSpeaking, 
  getInitialGreeting, 
  getConversationTopics, 
  fetchAiCallResponse,
  ConversationTopic 
} from '../utils/callVoiceService';

interface VideoCallModalProps {
  name: string;
  phoneNumber: string;
  avatar?: string;
  onClose: (durationSec: number) => void;
  onOpenQuickSend: (recipientName: string, recipientPhone: string) => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  name,
  phoneNumber,
  avatar,
  onClose,
  onOpenQuickSend,
}) => {
  const [status, setStatus] = useState<'dialing' | 'ringing' | 'connected' | 'ended'>('dialing');
  const [duration, setDuration] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live voice conversation state
  const [isCalleeSpeaking, setIsCalleeSpeaking] = useState(false);
  const [calleeSubtitle, setCalleeSubtitle] = useState<string | null>(null);
  const [userLastSpoken, setUserLastSpoken] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const topics = getConversationTopics(name);

  // Initialize camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function initCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          activeStream = stream;
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera access unavailable or declined, using simulated preview:', err);
        setCameraError('Camera simulation active (hardware not detected or permission denied)');
      }
    }

    initCamera();

    // Outgoing ringing sequence
    const dialTimer = setTimeout(() => {
      setStatus('ringing');
      startRingbackTone();
    }, 700);

    const answerTimer = setTimeout(() => {
      stopRingbackTone();
      playConnectedChime();
      setStatus('connected');

      // Callee speaks audible greeting!
      const greeting = getInitialGreeting(name);
      setCalleeSubtitle(greeting);
      setIsCalleeSpeaking(true);

      speakText(greeting, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    }, 3200);

    return () => {
      clearTimeout(dialTimer);
      clearTimeout(answerTimer);
      stopRingbackTone();
      stopSpeaking();
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [name]);

  // Duration count
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!videoTracks[0]?.enabled);
    } else {
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isSharingScreen && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsSharingScreen(true);
        screenStream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } else if (isSharingScreen && localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        setIsSharingScreen(false);
      }
    } catch {
      setIsSharingScreen(false);
    }
  };

  const addReaction = (emoji: string) => {
    const id = Date.now();
    const x = Math.random() * 60 + 20; // 20% to 80%
    setReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const [videoChatInput, setVideoChatInput] = useState('');
  const [isVideoThinking, setIsVideoThinking] = useState(false);

  const handleSelectTopic = async (topic: ConversationTopic) => {
    setActiveTopicId(topic.id);
    setUserLastSpoken(topic.userUtterance);
    stopSpeaking();
    setIsVideoThinking(true);

    try {
      const aiReply = await fetchAiCallResponse({
        calleeName: name,
        userMessage: topic.userUtterance,
      });
      setIsVideoThinking(false);
      setCalleeSubtitle(aiReply);
      setIsCalleeSpeaking(true);
      speakText(aiReply, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    } catch {
      setIsVideoThinking(false);
      setCalleeSubtitle(topic.calleeResponse);
      setIsCalleeSpeaking(true);
      speakText(topic.calleeResponse, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    }
  };

  const handleSendVideoMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoChatInput.trim()) return;
    const msg = videoChatInput;
    setVideoChatInput('');
    setUserLastSpoken(`"${msg}"`);
    stopSpeaking();
    setIsVideoThinking(true);

    try {
      const aiReply = await fetchAiCallResponse({
        calleeName: name,
        userMessage: msg,
      });
      setIsVideoThinking(false);
      setCalleeSubtitle(aiReply);
      setIsCalleeSpeaking(true);
      speakText(aiReply, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    } catch {
      setIsVideoThinking(false);
      const fallback = "I hear you crystal clear! 5G VoNR video is streaming at 60 frames per second.";
      setCalleeSubtitle(fallback);
      speakText(fallback, {
        onStart: () => setIsCalleeSpeaking(true),
        onEnd: () => setIsCalleeSpeaking(false),
      });
    }
  };

  const handleHangup = () => {
    stopRingbackTone();
    stopSpeaking();
    playHangupTone();
    setStatus('ended');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setTimeout(() => {
      onClose(duration);
    }, 900);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-lg p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[90vh] max-h-[750px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Top Video Overlay Bar */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between text-slate-100">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-full overflow-hidden border-2 ${
              isCalleeSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-emerald-400'
            }`}>
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-700 flex items-center justify-center text-emerald-300 font-bold">
                  {name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base leading-tight">{name}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  1080p 60fps HD
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                {status === 'connected' ? (
                  <span className="font-mono text-emerald-400 font-bold">{formatTime(duration)}</span>
                ) : (
                  <span className="animate-pulse capitalize text-teal-300">{status}...</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  E2E Encrypted VoNR
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Toggle Conversation Topics */}
            {status === 'connected' && (
              <button
                onClick={() => setShowTopics(!showTopics)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/70 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Topics</span>
              </button>
            )}

            {/* Quick in-video Send Money Button */}
            <button
              onClick={() => onOpenQuickSend(name, phoneNumber)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send KSh (0% &lt; 150)</span>
              <span className="sm:hidden">Pay</span>
            </button>
          </div>
        </div>

        {/* Main Remote Video Viewport */}
        <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {status === 'connected' ? (
            <div className="relative w-full h-full">
              {/* Simulated High-Def Remote Video Stream */}
              <img
                src={avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80"}
                alt={name}
                className="w-full h-full object-cover filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/40 pointer-events-none" />

              {/* LIVE CALLEE SPEECH SUBTITLE OVERLAY */}
              {calleeSubtitle && (
                <div className="absolute top-20 left-4 right-4 sm:right-auto sm:max-w-md z-30 p-3 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-emerald-500/30 text-white shadow-xl">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Volume2 className="w-3 h-3" />
                      <span>{name} (Live Voice)</span>
                    </span>
                    {isCalleeSpeaking && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] animate-pulse">
                        Speaking
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-100 font-sans leading-relaxed">
                    "{calleeSubtitle}"
                  </p>
                </div>
              )}

              {/* Remote live status badges */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-xs font-medium text-slate-200 border border-slate-700/60 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  EchoLink VoNR • 12ms Latency
                </span>
                {isCalleeSpeaking && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 backdrop-blur-md text-xs font-semibold text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" />
                    Speaking Now
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-teal-400 to-indigo-500 mb-4 animate-pulse">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-teal-300">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">{name}</h3>
              <p className="text-sm text-slate-400 font-mono mt-1">{phoneNumber}</p>
              <p className="text-xs text-emerald-400 font-medium mt-3 animate-pulse">
                {status === 'dialing' ? 'Establishing EchoLink 5G Video Route...' : 'Video Call Ringing...'}
              </p>
            </div>
          )}

          {/* Floating Conversation Topics Sheet in Video */}
          {status === 'connected' && showTopics && (
            <div className="absolute top-20 right-4 z-30 max-w-xs bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-2">
                <span>Talk to {name.split(' ')[0]}:</span>
                <button onClick={() => setShowTopics(false)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTopic(t)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition ${
                      activeTopicId === t.id
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {t.userLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Floating Reaction Emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {reactions.map(r => (
              <div
                key={r.id}
                className="absolute text-3xl animate-bounce"
                style={{
                  left: `${r.x}%`,
                  bottom: '15%',
                  animationDuration: '1s'
                }}
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Picture-in-Picture Local User Video Stream */}
          <div className="absolute bottom-20 sm:bottom-24 right-4 z-30 w-32 sm:w-44 h-48 sm:h-56 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-900 group transition-all duration-200">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''} ${isVideoMuted ? 'hidden' : 'block'}`}
            />
            {isVideoMuted && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-2 text-center">
                <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                <span className="text-[10px]">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 text-[10px] font-medium bg-slate-950/70 text-slate-200 px-1.5 py-0.5 rounded backdrop-blur-sm">
              You (Local 5G)
            </div>
          </div>
        </div>

        {/* Reaction Bar & Live Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 z-30 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Reaction Tray */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1">
            {['👍', '❤️', '👏', '💰', '🔥', '🇰🇪'].map(emoji => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="hover:scale-125 active:scale-95 transition-transform text-lg px-1"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Live In-Video Voice/Text Input */}
          {status === 'connected' && (
            <form onSubmit={handleSendVideoMessage} className="w-full sm:w-auto flex-1 max-w-xs flex items-center space-x-1.5">
              <input
                type="text"
                value={videoChatInput}
                onChange={(e) => setVideoChatInput(e.target.value)}
                placeholder={isVideoThinking ? "Thinking..." : `Talk to ${name.split(' ')[0]}...`}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!videoChatInput.trim() || isVideoThinking}
                className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition active:scale-95 shrink-0"
                title="Send message to callee"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Primary Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-2xl transition ${
                isAudioMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-2xl transition ${
                isVideoMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isVideoMuted ? 'Turn camera on' : 'Turn camera off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Flip / Mirror Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            <button
              onClick={handleScreenShare}
              className={`p-3 rounded-2xl transition ${
                isSharingScreen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Share Screen"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* End Call */}
            <button
              onClick={handleHangup}
              className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50 transition transform active:scale-95"
              title="End Video Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
