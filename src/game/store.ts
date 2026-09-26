/* 게임 UI 상태 스토어 — 진행·리더보드·오디오 슬라이스 조합.
   엔진 루프(ref)와 분리, 콜백에선 getState()로 최신값 접근 */

import { create } from 'zustand';
import { createGameSlice, type GameSlice } from './slices/game';
import { createLeaderboardSlice, type LeaderboardSlice } from './slices/leaderboard';
import { createAudioSlice, type AudioSlice } from './slices/audio';

export type { Toast } from './slices/game';
export interface GameState extends GameSlice, LeaderboardSlice, AudioSlice {}

export const useGameStore = create<GameState>()((set, get, api) => ({
  ...createGameSlice(set, get, api),
  ...createLeaderboardSlice(set, get, api),
  ...createAudioSlice(set, get, api),
}));
