/**
 * Web Audio API based Telecom Audio Synthesizer
 * Synthesizes standard DTMF tones, ringbacks, and telecom/fintech chimes
 * without relying on external mp3 files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// DTMF frequencies table
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function playDTMF(digit: string, duration = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = DTMF_FREQS[digit];
  if (!freqs) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(freqs[0], now);
  osc2.frequency.setValueAtTime(freqs[1], now);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

// Ringback tone player
let ringbackInterval: number | null = null;
let activeRingbackOscs: OscillatorNode[] = [];

export function startRingbackTone(): void {
  stopRingbackTone();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playBurst = () => {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(480, now);

    // 1.8 second ring tone
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.setValueAtTime(0.08, now + 1.8);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);

    activeRingbackOscs.push(osc1, osc2);
  };

  playBurst();
  // Standard ring cadence: 2 seconds on, 3 seconds off -> every 5 seconds
  ringbackInterval = window.setInterval(playBurst, 4000);
}

export function stopRingbackTone(): void {
  if (ringbackInterval) {
    clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
  activeRingbackOscs.forEach(osc => {
    try {
      osc.stop();
    } catch {
      // already stopped
    }
  });
  activeRingbackOscs = [];
}

export function playConnectedChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.1;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

export function playHangupTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Busy/disconnect beep
  [0, 0.25, 0.5].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + offset;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, startTime);
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.18);
  });
}

export function playMoneySentChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Fintech success 4-note arpeggio
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.08;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

// INCOMING CALL RINGTONE (Melodic Carrier Ring)
let ringtoneInterval: number | null = null;
let activeRingtoneOscs: OscillatorNode[] = [];

export function startIncomingRingtone(): void {
  stopIncomingRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playChimeSequence = () => {
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pleasant mobile phone marimba/chime sequence
    const melody = [
      { f: 659.25, d: 0.12, o: 0.0 },   // E5
      { f: 783.99, d: 0.12, o: 0.15 },  // G5
      { f: 987.77, d: 0.14, o: 0.30 },  // B5
      { f: 880.00, d: 0.14, o: 0.45 },  // A5
      { f: 659.25, d: 0.22, o: 0.65 },  // E5
      { f: 783.99, d: 0.30, o: 0.90 },  // G5
    ];

    melody.forEach(({ f, d, o }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + o;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + d);
      activeRingtoneOscs.push(osc);
    });
  };

  playChimeSequence();
  ringtoneInterval = window.setInterval(playChimeSequence, 2400);
}

export function stopIncomingRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  activeRingtoneOscs.forEach(osc => {
    try {
      osc.stop();
    } catch {}
  });
  activeRingtoneOscs = [];
}

/**
 * Authentic M-Pesa SMS Confirmation Tone
 * Plays a bright, signature dual-tone mobile money arrival chime
 */
export function playMpesaNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const tone1 = ctx.createOscillator();
  const tone2 = ctx.createOscillator();
  const gain = ctx.createGain();

  tone1.type = 'triangle';
  tone2.type = 'sine';

  // Warm, crisp M-Pesa incoming alert frequencies
  tone1.frequency.setValueAtTime(880, now); // A5
  tone1.frequency.setValueAtTime(1174.66, now + 0.08); // D6
  tone2.frequency.setValueAtTime(1479.98, now + 0.08); // F#6

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  tone1.connect(gain);
  tone2.connect(gain);
  gain.connect(ctx.destination);

  tone1.start(now);
  tone2.start(now + 0.08);
  tone1.stop(now + 0.35);
  tone2.stop(now + 0.45);
}

