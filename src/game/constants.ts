/* 보드 치수·게임 타이밍 상수 — 엔진·렌더·UI가 공유 */

export const BOARD_W = 480;
export const BOARD_H = 660;
export const WALL = 18;
export const DEADLINE_Y = 132;
export const DROP_Y = 66;

export const OVER_LIMIT_SEC = 3.0;
export const DANGER_AFTER_SEC = 0.15;
export const DROP_COOLDOWN_MS = 550;
export const SHAKE_COOLDOWN_MS = 2000;
export const DANGER_SHAKE_MAX = 5;
export const DANGER_CLEAR_RESET_SEC = 2.0;
export const COMBO_WINDOW_FRAMES = 90;
export const TOAST_MS = 1800;
export const FINAL_BONUS = 5000;

/** 진화 축하 토스트를 띄우는 최소 레벨 (7 = 포도) */
export const EVO_TOAST_MIN_LEVEL = 7;
