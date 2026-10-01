/* UI 설정 슬라이스 — 조작키 단순화 (localStorage에 영속) */

import type { StateCreator } from 'zustand';
import type { GameState } from '../store';

export interface SettingsSlice {
  simpleControls: boolean;
  setSimpleControls: (simple: boolean) => void;
  loadUiSettings: () => void;
}

const UI_SETTINGS_KEY = 'fruitparty.ui-settings';

function saveUiSettings(simpleControls: boolean): void {
  try {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify({ simpleControls }));
  } catch {
    // 저장소를 사용할 수 없어도 설정 변경은 현재 화면에서 동작한다.
  }
}

export const createSettingsSlice: StateCreator<GameState, [], [], SettingsSlice> = (set, get) => ({
  simpleControls: true,

  setSimpleControls: (simpleControls) => {
    set({ simpleControls });
    saveUiSettings(simpleControls);
  },
  loadUiSettings: () => {
    try {
      const stored = localStorage.getItem(UI_SETTINGS_KEY);
      if (!stored) return;
      const settings = JSON.parse(stored) as Record<string, unknown>;
      set({
        simpleControls: typeof settings.simpleControls === 'boolean' ? settings.simpleControls : get().simpleControls,
      });
    } catch {
      // 저장된 설정이 손상됐거나 저장소 접근이 막혀 있으면 기본값을 쓴다.
    }
  },
});
