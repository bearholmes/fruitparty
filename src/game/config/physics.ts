/* Matter 물리 파라미터 — 반발·마찰·밀도·스폰·정체 판정 */

export const GRAVITY_Y = 1.05;
export const WALL_FRICTION = 0.4;
export const WALL_RESTITUTION = 0;
export const DROP_FRICTION = 0.5;
export const MERGE_FRICTION = 0.45;
export const FRICTION_AIR = 0.008;
export const DENSITY_BASE = 0.0012;
export const DENSITY_PER_LEVEL = 0.00025;
export const DROP_INITIAL_VY = 2;
/** 합체 스폰 위치가 바닥에 박히지 않게 두는 여유 */
export const MERGE_SPAWN_FLOOR_PAD = 120;
/** 데드라인 위에서 이 속도보다 느리면 정체로 판정 */
export const OVERFLOW_STILL_VY = 0.35;
/** 합체에 필요한 접촉 유지 시간 — 스치는 접촉은 합체되지 않음 */
export const MERGE_DELAY_SEC = 0.3;
/** 과일 반발력 — 높을수록 쌓기가 불안정하고 합체가 어려워짐 */
export const FRUIT_RESTITUTION = 0.35;
