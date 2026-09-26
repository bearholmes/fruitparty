/* 합체 점수 — 과일 기본점 × 콤보 가산 × 피버 배율 */

import { FRUITS } from '../fruits';
import { COMBO_SCORE_STEP } from '../config/scoring';
import { FEVER_SCORE_MULT } from '../config/fever';

export function mergeScore(newLevel: number, combo: number, fever: boolean): number {
  return Math.round(
    FRUITS[newLevel].score * (1 + combo * COMBO_SCORE_STEP) * (fever ? FEVER_SCORE_MULT : 1),
  );
}
