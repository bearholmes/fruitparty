/* 피버 시간 규칙 — 단감 합체 시 연장/시작. DOM 의존 없음 */

import { FEVER_DURATION_SEC, FEVER_EXTEND_SEC, FEVER_MAX_SEC } from '../config/fever';

/** 단감 합체 후 피버 잔여 시간 — 진행 중이면 연장, 아니면 새로 시작. 상한에서 잘림 */
export function refreshFeverT(currentT: number): number {
  const next = currentT > 0 ? currentT + FEVER_EXTEND_SEC : FEVER_DURATION_SEC;
  return Math.min(next, FEVER_MAX_SEC);
}
