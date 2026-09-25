import { create } from 'zustand';
import { randDrop } from './art';
import { DANGER_SHAKE_MAX } from './constants';
import {
  fetchLeaderboard,
  qualifiesForLeaderboard,
  submitLeaderboardScore,
  type LeaderboardEntry,
} from './leaderboard';

export interface Toast {
  msg: string;
  key: number;
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

export interface GameState {
  score: number;
  best: number;
  combo: number;
  nextLv: number;
  over: boolean;
  paused: boolean;
  started: boolean;
  danger: boolean;
  dangerShakeLeft: number;
  isRecord: boolean;
  leaderboard: LeaderboardEntry[];
  pendingLeaderboard: boolean;
  submittedLeaderboard: boolean;
  submittingLeaderboard: boolean;
  submissionId: string | null;
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'error';
  leaderboardError: string | null;
  toast: Toast | null;
  evoUrls: string[];
  soundOn: boolean;
  bgmVolume: number;
  sfxVolume: number;
  canShake: boolean;
  addScore: (n: number) => void;
  setCombo: (combo: number) => void;
  setNextLv: (nextLv: number) => void;
  gameOver: () => void;
  refreshLeaderboard: () => Promise<void>;
  saveLeaderboardScore: (name: string) => Promise<boolean>;
  start: () => void;
  setDanger: (danger: boolean) => void;
  setDangerShakeLeft: (n: number) => void;
  setPaused: (paused: boolean) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
  setEvoUrls: (evoUrls: string[]) => void;
  toggleSound: () => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  loadAudioSettings: () => void;
  setCanShake: (v: boolean) => void;
  reset: (nextLv: number) => void;
}

/* 게임 UI 상태 스토어 — 엔진 루프(ref)와 분리, 콜백에선 getState()로 최신값 접근 */
export const useGameStore = create<GameState>()((set, get) => ({
  score: 0,
  best: 0,
  combo: 0,
  nextLv: randDrop(),
  over: false,
  paused: false,
  started: false,
  danger: false,
  dangerShakeLeft: DANGER_SHAKE_MAX,
  isRecord: false,
  leaderboard: [],
  pendingLeaderboard: false,
  submittedLeaderboard: false,
  submittingLeaderboard: false,
  submissionId: null,
  leaderboardStatus: 'idle',
  leaderboardError: null,
  toast: null,
  evoUrls: [],
  soundOn: true,
  bgmVolume: 1,
  sfxVolume: 1,
  canShake: true,

  addScore: (n) => {
    const score = get().score + Math.round(n);
    let { best } = get();
    if (score > best) best = score;
    set({ score, best });
  },
  setCombo: (combo) => set({ combo }),
  setNextLv: (nextLv) => set({ nextLv }),
  gameOver: () => {
    if (get().over) return;
    const { score, best } = get();
    set({
      over: true,
      paused: false,
      isRecord: score > 0 && score >= best,
      pendingLeaderboard: false,
      submittedLeaderboard: false,
      submittingLeaderboard: false,
      submissionId: crypto.randomUUID(),
    });
  },
  refreshLeaderboard: async () => {
    set({ leaderboardStatus: 'loading', leaderboardError: null });
    try {
      const leaderboard = await fetchLeaderboard();
      const { over, score, submittedLeaderboard } = get();
      set({
        leaderboard,
        best: Math.max(get().best, leaderboard[0]?.score ?? 0),
        pendingLeaderboard:
          over && !submittedLeaderboard && qualifiesForLeaderboard(score, leaderboard),
        leaderboardStatus: 'ready',
      });
    } catch (error) {
      set({ leaderboardStatus: 'error', leaderboardError: (error as Error).message });
    }
  },
  saveLeaderboardScore: async (name) => {
    const { over, pendingLeaderboard, submittedLeaderboard, submittingLeaderboard, score, submissionId } = get();
    if (!over || !pendingLeaderboard || submittedLeaderboard || submittingLeaderboard || !submissionId || !name.trim()) return false;
    set({ submittingLeaderboard: true, leaderboardError: null });
    try {
      const leaderboard = await submitLeaderboardScore(name.trim(), score, submissionId);
      set({
        leaderboard,
        pendingLeaderboard: false,
        submittedLeaderboard: true,
        submittingLeaderboard: false,
        leaderboardError: null,
      });
      return true;
    } catch (error) {
      set({ submittingLeaderboard: false, leaderboardError: (error as Error).message });
      return false;
    }
  },
  start: () => set({ started: true, paused: false }),
  setDanger: (danger) => set({ danger }),
  setDangerShakeLeft: (dangerShakeLeft) => set({ dangerShakeLeft }),
  setPaused: (paused) => set({ paused }),
  showToast: (msg) => set({ toast: { msg, key: Date.now() } }),
  hideToast: () => set({ toast: null }),
  setEvoUrls: (evoUrls) => set({ evoUrls }),
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
  setCanShake: (canShake) => set({ canShake }),
  reset: (nextLv) =>
    set({
      score: 0,
      combo: 0,
      over: false,
      paused: false,
      started: true,
      danger: false,
      dangerShakeLeft: DANGER_SHAKE_MAX,
      isRecord: false,
      pendingLeaderboard: false,
      submittedLeaderboard: false,
      submittingLeaderboard: false,
      submissionId: null,
      toast: null,
      nextLv,
      canShake: true,
    }),
}));
