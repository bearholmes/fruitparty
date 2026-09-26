/* 게임 진행 슬라이스 — 점수·콤보·상태·토스트·피버 (리더보드·오디오는 별도 슬라이스) */

import type { StateCreator } from 'zustand';
import type { GameState } from '../store';
import { randDrop } from '../fruits';
import { DANGER_SHAKE_MAX } from '../config/input';

export interface Toast {
  msg: string;
  key: number;
}

export interface GameSlice {
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  nextLv: number;
  over: boolean;
  paused: boolean;
  started: boolean;
  danger: boolean;
  dangerShakeLeft: number;
  isRecord: boolean;
  toast: Toast | null;
  evoUrls: string[];
  canShake: boolean;
  feverActive: boolean;
  feverLeft: number;
  feverCount: number;
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
  setCanShake: (v: boolean) => void;
  setFever: (active: boolean, left: number) => void;
  startFever: (duration: number) => void;
  reset: (nextLv: number) => void;
}

/* 토스트 키 — Date.now() 대신 단조 카운터 (동일 틱 중복 시 충돌 방지) */
let toastKey = 0;

export const createGameSlice: StateCreator<GameState, [], [], GameSlice> = (set, get) => ({
  score: 0,
  best: 0,
  combo: 0,
  maxCombo: 0,
  nextLv: randDrop(),
  over: false,
  paused: false,
  started: false,
  danger: false,
  dangerShakeLeft: DANGER_SHAKE_MAX,
  isRecord: false,
  toast: null,
  evoUrls: [],
  canShake: true,
  feverActive: false,
  feverLeft: 0,
  feverCount: 0,

  addScore: (n) => {
    const score = get().score + Math.round(n);
    let { best } = get();
    if (score > best) best = score;
    set({ score, best });
  },
  setCombo: (combo) => set({ combo, maxCombo: Math.max(get().maxCombo, combo) }),
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
  start: () => set({ started: true, paused: false }),
  setDanger: (danger) => set({ danger }),
  setDangerShakeLeft: (dangerShakeLeft) => set({ dangerShakeLeft }),
  setPaused: (paused) => set({ paused }),
  showToast: (msg) => set({ toast: { msg, key: ++toastKey } }),
  hideToast: () => set({ toast: null }),
  setEvoUrls: (evoUrls) => set({ evoUrls }),
  setCanShake: (canShake) => set({ canShake }),
  setFever: (feverActive, feverLeft) => set({ feverActive, feverLeft }),
  startFever: (duration) => set((state) => ({ feverActive: true, feverLeft: duration, feverCount: state.feverCount + 1 })),
  reset: (nextLv) =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      over: false,
      paused: false,
      started: true,
      danger: false,
      feverActive: false,
      feverLeft: 0,
      feverCount: 0,
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
});
