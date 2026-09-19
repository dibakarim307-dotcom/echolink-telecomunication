/**
 * EchoLink Call Voice & Real Audio Service
 * Provides real microphone analysis (live waveform detection from user's mic),
 * conversational AI backend integration via Gemini (/api/call/converse),
 * and realistic interactive voice synthesis for connected callers.
 */

export interface MicAnalyserHandle {
  getLevel: () => number;
  cleanup: () => void;
}

export function setupMicAnalyser(stream: MediaStream): MicAnalyserHandle {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return { getLevel: () => 0, cleanup: () => {} };
    }

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    // Do NOT connect to destination to avoid self-audio feedback
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const getLevel = (): number => {
      try {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0-255 to roughly 0-100 with sensitivity curve
        const level = Math.min(100, Math.round((avg / 128) * 100));
        return level;
      } catch {
        return 0;
      }
    };

    const cleanup = () => {
      try {
        source.disconnect();
        analyser.disconnect();
        ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    };

    return { getLevel, cleanup };
  } catch (err) {
    console.warn('Could not initialize mic analyser:', err);
    return { getLevel: () => 0, cleanup: () => {} };
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function speakText(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    gender?: 'female' | 'male';
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (callbacks?.onStart) callbacks.onStart();
    setTimeout(() => {
      if (callbacks?.onEnd) callbacks.onEnd();
    }, 1500);
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = callbacks?.gender === 'male' ? 0.92 : 1.08;

    // Select natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice: SpeechSynthesisVoice | undefined;

    if (callbacks?.gender === 'male') {
      preferredVoice = voices.find(
        v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Male') || v.name.includes('David'))
      );
    } else {
      preferredVoice = voices.find(
        v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Victoria') || v.name.includes('Female'))
      );
    }

    if (!preferredVoice) {
      preferredVoice = voices.find(
        v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google')))
      ) || voices.find(v => v.lang.startsWith('en'));
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      if (callbacks?.onStart) callbacks.onStart();
    };

    utterance.onend = () => {
      if (callbacks?.onEnd) callbacks.onEnd();
    };

    utterance.onerror = () => {
      if (callbacks?.onEnd) callbacks.onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    if (callbacks?.onEnd) callbacks.onEnd();
  }
}

/**
 * Fetch dynamic AI voice response from server powered by Gemini
 */
export async function fetchAiCallResponse(params: {
  calleeName: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
  isCustomerCare?: boolean;
}): Promise<string> {
  try {
    const res = await fetch('/api/call/converse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return data.reply;
      }
    }
  } catch {
    // Graceful offline/busy fallback handled below
  }

  // Fallback if network or server unavailable
  const lower = (params.userMessage || '').toLowerCase();
  const name = params.calleeName;
  if (params.isCustomerCare) {
    return "Thank you for calling EchoLink Telecom. All systems are running on 5G VoLTE with 0% fees on EchoPay transfers under 150 KSh.";
  }
  if (lower.includes('how are you') || lower.includes('doing')) {
    return `I'm doing well, thank you! It's so good to talk to you. How are things on your end?`;
  }
  if (lower.includes('money') || lower.includes('echopay') || lower.includes('send') || lower.includes('fee')) {
    return `Yes! I received your EchoPay transfer alert immediately. The zero fees under 150 KSh make small payments so convenient!`;
  }
  if (lower.includes('clear') || lower.includes('hear')) {
    return `I hear you loud and clear! The VoLTE HD audio is super crisp today.`;
  }
  return `Hey! I hear you loud and clear. That sounds really interesting! Tell me more.`;
}

/**
 * Returns conversational dialogues tailored to the recipient
 */
export function getInitialGreeting(contactName: string): string {
  const firstName = contactName.split(' ')[0] || contactName;
  const greetings: Record<string, string> = {
    'Customer Care': "Hello, welcome to EchoLink Customer Care! How can I assist you with your line or EchoPay today?",
    'Sarah': "Hello! Hey there, so good to hear from you! How is your day going?",
    'David': "Hello! David here. Great timing, I was just checking my phone. How can I help you?",
    'Mama': "Hello mwanangu! Habari yako? Good to hear your voice, how are you doing?",
    'Peter': "Hey! Peter on the line. The EchoLink connection is super clear today! What's up?",
    'Grace': "Hello! Grace here. Thanks for calling! What have you been up to?",
    'John': "Hello! John here. Loud and clear! How are things on your side?",
  };

  for (const [key, msg] of Object.entries(greetings)) {
    if (contactName.toLowerCase().includes(key.toLowerCase())) {
      return msg;
    }
  }

  return `Hello! This is ${firstName}. Thanks for calling! I can hear you loud and clear.`;
}

export interface ConversationTopic {
  id: string;
  userLabel: string;
  userUtterance: string;
  calleeResponse: string;
}

export function getConversationTopics(contactName: string): ConversationTopic[] {
  const isCare = contactName.toLowerCase().includes('care') || contactName.toLowerCase().includes('echolink');
  if (isCare) {
    return [
      {
        id: 'check_balance',
        userLabel: 'Check My Balance',
        userUtterance: 'Can you check my EchoLink airtime and data balance?',
        calleeResponse: 'Your current airtime balance is 420 KSh, and you have 12.4 GB remaining on your monthly 5G bundle. You can also dial *144# anytime!',
      },
      {
        id: 'echopay_tariffs',
        userLabel: 'EchoPay 0% Fee Info',
        userUtterance: 'How do the zero fees under 150 KSh work on EchoPay?',
        calleeResponse: 'On EchoPay, every transfer under 150 KSh is 100% free with zero transaction fees, and all larger transfers are 2% cheaper than competitor tariffs!',
      },
      {
        id: 'volte_status',
        userLabel: 'Network VoLTE Status',
        userUtterance: 'Is my phone currently connected to VoLTE HD voice?',
        calleeResponse: 'Yes! Your line is active on EchoLink 5G VoLTE with Opus 48 kilohertz audio and less than 15 milliseconds latency.',
      },
      {
        id: 'agent_speak',
        userLabel: 'Speak to Live Agent',
        userUtterance: 'Can I speak with an EchoLink supervisor?',
        calleeResponse: 'You are speaking with our premier AI customer voice representative, but I can also route you to a regional branch if you require physical SIM replacement.',
      }
    ];
  }

  const firstName = contactName.split(' ')[0] || 'friend';
  return [
    {
      id: 'how_are_you',
      userLabel: "How are you?",
      userUtterance: "Hey, how have you been doing lately?",
      calleeResponse: `I've been doing great, thank you! Just wrapping up some tasks. How about you, ${firstName}? Everything good?`,
    },
    {
      id: 'money_check',
      userLabel: "Check EchoPay Transfer",
      userUtterance: "Did you receive the money I sent over EchoPay?",
      calleeResponse: "Yes, I got the SMS confirmation immediately! Zero transaction fees under 150 KSh is amazing. Thank you so much!",
    },
    {
      id: 'hd_quality',
      userLabel: "Call Quality",
      userUtterance: "How does the call sound on your end? The VoLTE audio is super crisp.",
      calleeResponse: "It sounds incredible! Truly HD voice with zero background noise. Feels like you're standing right next to me.",
    },
    {
      id: 'meet_up',
      userLabel: "Catch up later",
      userUtterance: "Are we still meeting up later this week?",
      calleeResponse: "Definitely! Let's connect on Friday afternoon. I'll send you the location pin over message.",
    },
    {
      id: 'goodbye',
      userLabel: "Wrap up call",
      userUtterance: "Alright, I'll let you get back to what you were doing. Talk soon!",
      calleeResponse: "Awesome! Thanks for calling, take care and have a wonderful day!",
    },
  ];
}
