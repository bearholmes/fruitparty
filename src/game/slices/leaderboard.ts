/* 리더보드 슬라이스 — 순위표 조회·점수 제출 (제출 번호로 중복 등록 방지) */

import type { StateCreator } from 'zustand';
import type { GameState } from '../store';
import {
  fetchLeaderboard,
  qualifiesForAnyLeaderboard,
  submitLeaderboardScore,
  type LeaderboardBoards,
} from '../leaderboard';

export interface LeaderboardSlice {
  leaderboard: LeaderboardBoards;
  pendingLeaderboard: boolean;
  submittedLeaderboard: boolean;
  submittingLeaderboard: boolean;
  submissionId: string | null;
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'error';
  leaderboardError: string | null;
  refreshLeaderboard: () => Promise<void>;
  saveLeaderboardScore: (name: string, allowUnconfirmed?: boolean) => Promise<boolean>;
}

export const createLeaderboardSlice: StateCreator<GameState, [], [], LeaderboardSlice> = (set, get) => ({
  leaderboard: { daily: [], weekly: [], all: [] },
  pendingLeaderboard: false,
  submittedLeaderboard: false,
  submittingLeaderboard: false,
  submissionId: null,
  leaderboardStatus: 'idle',
  leaderboardError: null,

  refreshLeaderboard: async () => {
    set({ leaderboardStatus: 'loading', leaderboardError: null });
    try {
      const leaderboard = await fetchLeaderboard();
      const { over, score, submittedLeaderboard } = get();
      set({
        leaderboard,
        best: Math.max(get().best, leaderboard.all[0]?.score ?? 0),
        pendingLeaderboard:
          over && !submittedLeaderboard && qualifiesForAnyLeaderboard(score, leaderboard),
        leaderboardStatus: 'ready',
      });
    } catch (error) {
      set({ leaderboardStatus: 'error', leaderboardError: (error as Error).message });
    }
  },
  saveLeaderboardScore: async (name, allowUnconfirmed = false) => {
    const { over, pendingLeaderboard, submittedLeaderboard, submittingLeaderboard, score, maxCombo, feverCount, submissionId } = get();
    if (!over || (!pendingLeaderboard && !allowUnconfirmed) || submittedLeaderboard || submittingLeaderboard || !submissionId || !name.trim() || score <= 0) return false;
    set({ submittingLeaderboard: true, leaderboardError: null });
    try {
      const leaderboard = await submitLeaderboardScore(name.trim(), score, maxCombo, feverCount, submissionId);
      if (get().submissionId !== submissionId) {
        set({ leaderboard });
        return true;
      }
      set({
        leaderboard,
        pendingLeaderboard: false,
        submittedLeaderboard: true,
        submittingLeaderboard: false,
        leaderboardError: null,
      });
      return true;
    } catch (error) {
      if (get().submissionId === submissionId) {
        set({ submittingLeaderboard: false, leaderboardError: (error as Error).message });
      }
      return false;
    }
  },
});
