/* Matter 물리 파라미터 — 반발·마찰·밀도·스폰·정체 판정 */

/** Matter 중력 Y 배율(기본값 1 기준) */
export const GRAVITY_Y = 1.05;
/** 벽·바닥 마찰 계수 */
export const WALL_FRICTION = 0.4;
/** 벽·바닥 반발 계수 — 0이면 튕기지 않음 */
export const WALL_RESTITUTION = 0;
/** 낙하 과일의 마찰 계수 */
export const DROP_FRICTION = 0.5;
/** 합체로 생성된 과일의 마찰 계수 */
export const MERGE_FRICTION = 0.45;
/** 공기 저항(감쇠) 계수 */
export const FRICTION_AIR = 0.008;
/** 과일 밀도 기본값 — 밀도 = BASE + 레벨 × PER_LEVEL */
export const DENSITY_BASE = 0.0012;
/** 레벨당 추가 밀도 — 큰 과일일수록 무거워짐 */
export const DENSITY_PER_LEVEL = 0.00025;
/** 낙하 직후 부여하는 초기 하강 속도 */
export const DROP_INITIAL_VY = 2;
/** 합체 스폰 위치가 바닥에 박히지 않게 두는 여유 */
export const MERGE_SPAWN_FLOOR_PAD = 120;
/** 데드라인 위에서 이 속도보다 느리면 정체로 판정 */
export const OVERFLOW_STILL_VY = 0.35;
/** 합체에 필요한 접촉 유지 시간 — 스치는 접촉은 합체되지 않음 */
export const MERGE_DELAY_SEC = 0.25;
/** 과일 반발력 — 높을수록 쌓기가 불안정하고 합체가 어려워짐 */
export const FRUIT_RESTITUTION = 0.35;
