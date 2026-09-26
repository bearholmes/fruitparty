/* WebAudio 신스 효과음 — 에셋 없이 오실레이터·노이즈로 합성. */

import { useGameStore } from './store';
import { ensureAudioContext } from './audio/context';
import { playTone, playNoise } from './audio/synth';
import { MERGE_SCALE, MERGE_COMBO_MAX_SEMI } from './config/audio';

export { ensureAudioContext } from './audio/context';

/** 합체음 높이 = 레벨 음계 × 콤보 반음 올림 (최대 +5반음) */
export function mergeFreq(level: number, combo: number): number {
  const base = MERGE_SCALE[Math.min(Math.max(level, 0), MERGE_SCALE.length - 1)];
  return base * Math.pow(2, Math.min(Math.max(combo, 0), MERGE_COMBO_MAX_SEMI) / 12);
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
  playTone(c, c.destination, {
    freq: o.freq,
    freqEnd: o.freqEnd,
    type: o.type,
    dur: o.dur,
    vol: (o.vol ?? 0.15) * useGameStore.getState().sfxVolume,
    attack: 0.01,
    delay: o.delay,
  });
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
  playNoise(c, c.destination, {
    dur: o.dur,
    vol: (o.vol ?? 0.2) * useGameStore.getState().sfxVolume,
    filterFreq: o.filterFreq,
    filterType: o.type,
    delay: o.delay,
  });
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
  fever(): void {
    [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) =>
      tone({ freq, dur: 0.14, vol: 0.14, delay: i * 0.09 }),
    );
  },
  ui(): void {
    tone({ freq: 660, dur: 0.07, vol: 0.07 });
  },
};
