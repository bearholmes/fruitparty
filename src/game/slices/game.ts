/* 게임 진행 슬라이스 — 점수·콤보·상태·토스트·피버 (리더보드·오디오는 별도 슬라이스) */

import type { StateCreator } from 'zustand';
import type { GameState } from '../store';
import { randDrop } from '../fruits';
import { DANGER_SHAKE_MAX } from '../config/input';
import { NEXT_PREVIEW_COUNT } from '../config/ui';

const PERSONAL_BEST_KEY = 'fruitparty.personal-best';

export interface Toast {
  msg: string;
  key: number;
}

export interface GameSlice {
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  nextQueue: number[];
  over: boolean;
  gameOverAt: number | null;
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
  loadPersonalBest: () => void;
  setCombo: (combo: number) => void;
  setNextQueue: (nextQueue: number[]) => void;
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
  reset: (nextQueue: number[]) => void;
}

/* 토스트 키 — Date.now() 대신 단조 카운터 (동일 틱 중복 시 충돌 방지) */
let toastKey = 0;

export const createGameSlice: StateCreator<GameState, [], [], GameSlice> = (set, get) => ({
  score: 0,
  best: 0,
  combo: 0,
  maxCombo: 0,
  /* 초기 낙하 0개 → 초반 풀 */
  nextQueue: Array.from({ length: NEXT_PREVIEW_COUNT }, () => randDrop(0)),
  over: false,
  gameOverAt: null,
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

  addScore: (n) => set({ score: get().score + Math.round(n) }),
  loadPersonalBest: () => {
    try {
      const saved = Number(localStorage.getItem(PERSONAL_BEST_KEY));
      if (Number.isSafeInteger(saved) && saved >= 0) set({ best: saved });
    } catch {
      // 저장소를 사용할 수 없어도 게임은 계속한다.
    }
  },
  setCombo: (combo) => set({ combo, maxCombo: Math.max(get().maxCombo, combo) }),
  setNextQueue: (nextQueue) => set({ nextQueue }),
  gameOver: () => {
    if (get().over) return;
    const { score, best } = get();
    const isRecord = score > best;
    if (isRecord) {
      try {
        localStorage.setItem(PERSONAL_BEST_KEY, String(score));
      } catch {
        // 저장소를 사용할 수 없어도 현재 화면의 개인 베스트는 갱신한다.
      }
    }
    set({
      best: isRecord ? score : best,
      over: true,
      gameOverAt: Date.now(),
      // React의 조회 effect가 실행되기 전부터 재시작을 막는다.
      leaderboardStatus: 'loading',
      leaderboardError: null,
      paused: false,
      isRecord,
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
  reset: (nextQueue) =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      over: false,
      gameOverAt: null,
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
      nextQueue,
      canShake: true,
    }),
});
