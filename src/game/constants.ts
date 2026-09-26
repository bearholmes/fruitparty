/* 보드 치수·게임 타이밍 상수 — 엔진·렌더·UI가 공유 */

export const BOARD_W = 420;
export const BOARD_H = 660;
export const WALL = 18;
export const DEADLINE_Y = 132;
export const DROP_Y = 66;

export const OVER_LIMIT_SEC = 3.0;
/** 과일 반발력 — 높을수록 쌓기가 불안정하고 합체가 어려워짐 */
export const FRUIT_RESTITUTION = 0.35;
/** 합체에 필요한 접촉 유지 시간 — 스치는 접촉은 합체되지 않음 */
export const MERGE_DELAY_SEC = 0.3;
export const DANGER_AFTER_SEC = 0.15;
export const DROP_COOLDOWN_MS = 300;
export const SHAKE_COOLDOWN_MS = 2000;
export const DANGER_SHAKE_MAX = 5;
export const DANGER_CLEAR_RESET_SEC = 2.0;
export const COMBO_WINDOW_FRAMES = 120;
export const TOAST_MS = 1800;
export const FINAL_BONUS = 5000;
/** 단감 합체 보상 피버 — 지속시간·점수배율·낙하쿨다운·콤보유지·폭발반경·정리상한 */
export const FEVER_DURATION_SEC = 30;
export const FEVER_SCORE_MULT = 3;
export const FEVER_DROP_COOLDOWN_MS = 120;
export const FEVER_COMBO_WINDOW_FRAMES = 360;
export const FEVER_BLAST_RADIUS = 240;
export const FEVER_BLAST_MAX_LEVEL = 6;

/** 진화 축하 토스트를 띄우는 최소 레벨 (7 = 포도) */
export const EVO_TOAST_MIN_LEVEL = 7;
