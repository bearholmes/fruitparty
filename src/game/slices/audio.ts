/* 오디오 설정 슬라이스 — 소리 ON/OFF·볼륨 (localStorage에 영속) */

import type { StateCreator } from 'zustand';
import type { GameState } from '../store';

export interface AudioSlice {
  soundOn: boolean;
  bgmVolume: number;
  sfxVolume: number;
  toggleSound: () => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  loadAudioSettings: () => void;
}

const AUDIO_SETTINGS_KEY = 'fruitparty.audio-settings';

function volume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function saveAudioSettings(soundOn: boolean, bgmVolume: number, sfxVolume: number): void {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ soundOn, bgmVolume, sfxVolume }));
  } catch {
    // 저장소를 사용할 수 없어도 소리 조절은 현재 화면에서 동작한다.
  }
}

export const createAudioSlice: StateCreator<GameState, [], [], AudioSlice> = (set, get) => ({
  soundOn: true,
  bgmVolume: 0.5,
  sfxVolume: 1,

  toggleSound: () => {
    const { soundOn, bgmVolume, sfxVolume } = get();
    set({ soundOn: !soundOn });
    saveAudioSettings(!soundOn, bgmVolume, sfxVolume);
  },
  setBgmVolume: (value) => {
    const bgmVolume = volume(value);
    set({ bgmVolume });
    saveAudioSettings(get().soundOn, bgmVolume, get().sfxVolume);
  },
  setSfxVolume: (value) => {
    const sfxVolume = volume(value);
    set({ sfxVolume });
    saveAudioSettings(get().soundOn, get().bgmVolume, sfxVolume);
  },
  loadAudioSettings: () => {
    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!stored) return;
      const settings = JSON.parse(stored) as Record<string, unknown>;
      const current = get();
      set({
        soundOn: typeof settings.soundOn === 'boolean' ? settings.soundOn : current.soundOn,
        bgmVolume: typeof settings.bgmVolume === 'number' && Number.isFinite(settings.bgmVolume)
          ? volume(settings.bgmVolume) : current.bgmVolume,
        sfxVolume: typeof settings.sfxVolume === 'number' && Number.isFinite(settings.sfxVolume)
          ? volume(settings.sfxVolume) : current.sfxVolume,
      });
    } catch {
      // 저장된 설정이 손상됐거나 저장소 접근이 막혀 있으면 기본값을 쓴다.
    }
  },
});
