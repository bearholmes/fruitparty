/* WebAudio 신스 효과음 — 에셋 없이 오실레이터·노이즈로 합성. */

import { useGameStore } from './store';

/** 합체 음계 (C5~A6 펜타토닉 기반, 레벨별 1음) */
const MERGE_SCALE = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1568.0, 1760.0,
];

/** 합체음 높이 = 레벨 음계 × 콤보 반음 올림 (최대 +5반음) */
export function mergeFreq(level: number, combo: number): number {
  const base = MERGE_SCALE[Math.min(Math.max(level, 0), MERGE_SCALE.length - 1)];
  return base * Math.pow(2, Math.min(Math.max(combo, 0), 5) / 12);
}

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export function ensureAudioContext(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function ac(): AudioContext | null {
  const { soundOn, sfxVolume } = useGameStore.getState();
  if (!soundOn || sfxVolume === 0) return null;
  return ensureAudioContext();
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  delay?: number;
}

function tone(o: ToneOpts): void {
  const c = ac();
  if (!c) return;
  try {
    const dur = o.dur ?? 0.15;
    const t0 = c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((o.vol ?? 0.15) * useGameStore.getState().sfxVolume, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  filterFreq?: number;
  type?: BiquadFilterType;
  delay?: number;
}

function noise(o: NoiseOpts): void {
  const c = ac();
  if (!c) return;
  try {
    if (!noiseBuf) {
      const len = Math.max(1, Math.floor(c.sampleRate * 1));
      noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const dur = o.dur ?? 0.3;
    const t0 = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.value = o.filterFreq ?? 800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((o.vol ?? 0.2) * useGameStore.getState().sfxVolume, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

export const sfx = {
  drop(): void {
    tone({ freq: 300, freqEnd: 170, type: 'triangle', dur: 0.12, vol: 0.18 });
  },
  merge(level: number, combo: number): void {
    const f = mergeFreq(level, combo);
    tone({ freq: f, dur: 0.22, vol: 0.16 });
    tone({ freq: f * 2, dur: 0.15, vol: 0.05 });
  },
  explosion(): void {
    noise({ dur: 0.45, vol: 0.25, filterFreq: 900, type: 'bandpass' });
    tone({ freq: 480, freqEnd: 70, dur: 0.5, vol: 0.2 });
  },
  shake(): void {
    noise({ dur: 0.35, vol: 0.2, filterFreq: 300 });
    tone({ freq: 110, freqEnd: 70, dur: 0.3, vol: 0.15 });
  },
  gameOver(): void {
    [392.0, 329.63, 261.63, 196.0].forEach((freq, i) =>
      tone({ freq, dur: 0.2, vol: 0.16, delay: i * 0.16 }),
    );
  },
  fanfare(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ freq, dur: 0.16, vol: 0.14, delay: i * 0.11 }),
    );
    tone({ freq: 2093.0, dur: 0.3, vol: 0.04, delay: 0.44 });
  },
  ui(): void {
    tone({ freq: 660, dur: 0.07, vol: 0.07 });
  },
};
