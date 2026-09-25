import { create } from 'zustand';
import { randDrop } from './art';
import { DANGER_SHAKE_MAX } from './constants';

const BEST_KEY = 'fruitparty-best';

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
  toast: Toast | null;
  evoUrls: string[];
  soundOn: boolean;
  canShake: boolean;
  addScore: (n: number) => void;
  setCombo: (combo: number) => void;
  setNextLv: (nextLv: number) => void;
  gameOver: () => void;
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

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/* 게임 UI 상태 스토어 — 엔진 루프(ref)와 분리, 콜백에선 getState()로 최신값 접근 */
export const useGameStore = create<GameState>()((set, get) => ({
  score: 0,
  best: loadBest(),
  combo: 0,
  nextLv: randDrop(),
  over: false,
  paused: false,
  started: false,
  danger: false,
  dangerShakeLeft: DANGER_SHAKE_MAX,
  isRecord: false,
  toast: null,
  evoUrls: [],
  soundOn: true,
  canShake: true,

  addScore: (n) => {
    const score = get().score + Math.round(n);
    let { best } = get();
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* 저장 실패 무시 */
      }
    }
    set({ score, best });
  },
  setCombo: (combo) => set({ combo }),
  setNextLv: (nextLv) => set({ nextLv }),
  gameOver: () => {
    const { score, best } = get();
    set({ over: true, paused: false, isRecord: score > 0 && score >= best });
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
      toast: null,
      nextLv,
      canShake: true,
    }),
}));
