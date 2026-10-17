/**
 * Lightweight Web Audio API Ambient Sound Generator for Focus Sessions.
 * Pure procedural audio synthesis — 0 external audio files needed.
 */

export type AmbientSoundType = 'off' | 'rain' | 'flow' | 'whitenoise';

let audioCtx: AudioContext | null = null;
let currentSource: AudioNode | null = null;
let gainNode: GainNode | null = null;
let activeSound: AmbientSoundType = 'off';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function stopAmbientSound(): void {
  if (currentSource) {
    try {
      if ('stop' in currentSource && typeof (currentSource as AudioScheduledSourceNode).stop === 'function') {
        (currentSource as AudioScheduledSourceNode).stop();
      }
      currentSource.disconnect();
    } catch {
      // ignore
    }
    currentSource = null;
  }
  activeSound = 'off';
}

export function playAmbientSound(type: AmbientSoundType, volume = 0.12): void {
  stopAmbientSound();
  if (type === 'off') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.connect(ctx.destination);

  if (type === 'whitenoise' || type === 'rain') {
    // Generate pink/brown noise for soft rain / white noise
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter algorithm
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * (type === 'rain' ? 0.04 : 0.025);
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    if (type === 'rain') {
      // Add a lowpass filter for gentle rain acoustics
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, ctx.currentTime);
      whiteNoise.connect(filter);
      filter.connect(gainNode);
    } else {
      whiteNoise.connect(gainNode);
    }

    whiteNoise.start(0);
    currentSource = whiteNoise;
    activeSound = type;
  } else if (type === 'flow') {
    // 40Hz binaural/gamma beat carrier tone (soft 180Hz + 220Hz harmonious tone)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, ctx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);

    osc1.start(0);
    osc2.start(0);

    currentSource = {
      disconnect() {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        } catch {
          // ignore
        }
      },
    } as unknown as AudioNode;
    activeSound = type;
  }
}

export function getActiveAmbientSound(): AmbientSoundType {
  return activeSound;
}

/**
 * Plays a soft, delicate "crystallize" harmonic shimmer on each minute boundary.
 */
export function playCrystallizeChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Glassy pentatonic/crystalline harmonics (E6, B6, F#7, E7)
    const partials: [number, number, number, number][] = [
      [1318.5, 0.0, 0.045, 0.42],
      [1975.5, 0.04, 0.035, 0.48],
      [2637.0, 0.08, 0.025, 0.55],
      [2959.9, 0.13, 0.018, 0.62],
    ];

    partials.forEach(([freq, delay, peakGain, duration]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      // Slight upward crystal pitch bend
      osc.frequency.exponentialRampToValueAtTime(freq * 1.006, now + delay + duration);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    });
  } catch {
    // Audio must never interrupt timer execution
  }
}

/**
 * Plays a subtle quantum collapse + supernova shimmer when a round finishes.
 */
export function playSupernovaBurst(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Collapse sweep followed by crystalline chord
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(520, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
    sweepOsc.frequency.exponentialRampToValueAtTime(880, now + 0.65);

    sweepGain.gain.setValueAtTime(0.0001, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    sweepOsc.connect(sweepGain).connect(ctx.destination);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.72);
  } catch {
    // ignore
  }
}

