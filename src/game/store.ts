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
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'error';
  leaderboardError: string | null;
  toast: Toast | null;
  evoUrls: string[];
  soundOn: boolean;
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
  leaderboardStatus: 'idle',
  leaderboardError: null,
  toast: null,
  evoUrls: [],
  soundOn: true,
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
    const { score, best } = get();
    set({
      over: true,
      paused: false,
      isRecord: score > 0 && score >= best,
      pendingLeaderboard: false,
      submittedLeaderboard: false,
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
    const { over, pendingLeaderboard, score } = get();
    if (!over || !pendingLeaderboard || !name.trim()) return false;
    try {
      const leaderboard = await submitLeaderboardScore(name.trim(), score);
      set({
        leaderboard,
        pendingLeaderboard: false,
        submittedLeaderboard: true,
        leaderboardError: null,
      });
      return true;
    } catch (error) {
      set({ leaderboardError: (error as Error).message });
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
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
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
      toast: null,
      nextLv,
      canShake: true,
    }),
}));
