/* 단감 합체 보상 피버 — 지속시간·연장·상한·점수배율·낙하쿨다운·콤보유지·폭발반경·정리상한·합체지연·흔들기·드롭풀 */

/** 피버 지속 시간(초) */
export const FEVER_DURATION_SEC = 30;
/** 피버 중 단감 합체 시 연장되는 시간(초) — 리셋 대신 잔여 시간에 가산 */
export const FEVER_EXTEND_SEC = 30;
/** 피버 잔여 시간 상한(초) — 연장 합산이 이 값을 넘으면 잘림 */
export const FEVER_MAX_SEC = 60;
/** 피버 중 합체 점수 배율 */
export const FEVER_SCORE_MULT = 3;
/** 피버 중 낙하 쿨다운(ms) */
export const FEVER_DROP_COOLDOWN_MS = 120;
/** 피버 중 콤보 유지 프레임 수 — 합체 시 리필, 0이 되면 콤보 종료 */
export const FEVER_COMBO_WINDOW_FRAMES = 360;
/** 피버 발동 시 주변 정리 폭발 반경(px) — 합체 지점 기준 */
export const FEVER_BLAST_RADIUS = 240;
/** 폭발로 정리되는 최대 과일 레벨 — 이 레벨 이하만 점수로 전환 */
export const FEVER_BLAST_MAX_LEVEL = 6;
/** 피버 중 합체에 필요한 접촉 유지 시간(초) */
export const FEVER_MERGE_DELAY_SEC = 0.05;
/** 피버 중 흔들기 충격 배율 */
export const FEVER_SHAKE_MULT = 1.5;
/** 피버 중 흔들기 쿨다운(ms) */
export const FEVER_SHAKE_COOLDOWN_MS = 1000;

/** 피버 중 드롭 최소 레벨(0-based 인덱스) — 상위 과일 위주로 나와 합체가 쉬워짐 */
export const FEVER_MIN_DROP_LEVEL = 2;
/** 피버 중 드롭 최대 레벨(0-based 인덱스) */
export const FEVER_MAX_DROP_LEVEL = 5;
/** 피버 중 레벨별 드롭 가중치 — 인덱스 = 과일 레벨, 값 = 풀 내 개수(윈도우 밖 레벨은 예비값) */
export const FEVER_DROP_WEIGHTS = [1, 1, 2, 3, 2, 1, 1, 1, 1, 1];
