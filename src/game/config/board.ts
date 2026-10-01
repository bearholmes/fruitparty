/* 보드 치수·데드라인 — 렌더·물리·UI가 공유 */

/** 보드 가로 너비(px) — 캔버스·물리·입력 좌표의 기준 */
export const BOARD_W = 420;
/** 보드 세로 높이(px) */
export const BOARD_H = 660;
/** 좌·우·하단 벽 두께(px) — 과일 이동 범위 제한에도 사용 */
export const WALL = 18;
/** 데드라인 Y좌표(px) — 이 선 위에 과일이 정체되면 위험·오버플로 판정 */
export const DEADLINE_Y = 132;
/** 과일 낙하 시작 Y좌표(px) — 에임 가이드·프리뷰 표시 위치 */
export const DROP_Y = 66;

/** 데드라인 위 정체 누적 시 게임오버까지의 제한 시간(초) */
export const OVER_LIMIT_SEC = 3.0;
/** 정체 누적 이 시간(초) 초과 시 위험 상태로 전환 */
export const DANGER_AFTER_SEC = 0.15;
/** 위험 해제 후 이 시간(초) 유지되면 위험 흔들기 횟수 충전 */
export const DANGER_CLEAR_RESET_SEC = 2.0;
