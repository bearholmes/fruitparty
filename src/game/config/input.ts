/* 입력·쿨다운·흔들기 튜닝값 */

export const DROP_COOLDOWN_MS = 300;
export const SHAKE_COOLDOWN_MS = 2000;
export const DANGER_SHAKE_MAX = 5;
/** 키보드 ←/→ 1회 이동량(px) */
export const KEY_MOVE_STEP = 14;
/** 화면 버튼 1회 이동량(px) */
export const BUTTON_MOVE_STEP = 24;
/** 흔들기 충격량 — vx = dir × (MIN + rand × VAR), vy = -(MIN + rand × VAR) */
export const SHAKE_VX_MIN = 2.5;
export const SHAKE_VX_VAR = 3.5;
export const SHAKE_VY_MIN = 1;
export const SHAKE_VY_VAR = 2.5;
export const SHAKE_SPIN = 0.4;
