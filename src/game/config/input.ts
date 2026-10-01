/* 입력·쿨다운·흔들기 튜닝값 */

/** 과일 낙하 후 다음 낙하까지의 쿨다운(ms) */
export const DROP_COOLDOWN_MS = 300;
/** 흔들기 사용 후 쿨다운(ms) */
export const SHAKE_COOLDOWN_MS = 2000;
/** 위험 상태에서 충전되는 흔들기 최대 횟수 */
export const DANGER_SHAKE_MAX = 5;
/** 키보드 ←/→ 1회 이동량(px) */
export const KEY_MOVE_STEP = 14;
/** 화면 버튼 1회 이동량(px) */
export const BUTTON_MOVE_STEP = 24;
/** 흔들기 충격량 — vx = dir × (MIN + rand × VAR), vy = -(MIN + rand × VAR) */
export const SHAKE_VX_MIN = 2.5; // 수평 최소 충격량
export const SHAKE_VX_VAR = 3.5; // 수평 무작위 가산 범위
export const SHAKE_VY_MIN = 1.5; // 수직 최소 충격량(위로 튀어오름)
export const SHAKE_VY_VAR = 3.5; // 수직 무작위 가산 범위
/** 흔들기 시 과일에 더해지는 무작위 회전(각속도) 범위 계수 */
export const SHAKE_SPIN = 0.5;
