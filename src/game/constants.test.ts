import { describe, it, expect } from 'vitest';
import {
  BOARD_W,
  DEADLINE_Y,
  OVER_LIMIT_SEC,
  DROP_COOLDOWN_MS,
  DANGER_SHAKE_MAX,
  FRUIT_RESTITUTION,
  MERGE_DELAY_SEC,
  COMBO_WINDOW_FRAMES,
  FEVER_DURATION_SEC,
  FEVER_SCORE_MULT,
  FEVER_DROP_COOLDOWN_MS,
  FEVER_COMBO_WINDOW_FRAMES,
  FEVER_BLAST_RADIUS,
  FEVER_BLAST_MAX_LEVEL,
} from './constants';

/* 의도된 난이도 튜닝값 — 리밸런싱 시 이 기대값도 함께 갱신할 것 */
describe('constants', () => {
  it('난이도 튜닝값(보드폭·데드라인·유예·쿨다운·흔들기·반발력·합체지연·콤보윈도우)이 의도와 일치한다', () => {
    expect(BOARD_W).toBe(420);
    expect(DEADLINE_Y).toBe(132);
    expect(OVER_LIMIT_SEC).toBe(3.0);
    expect(DROP_COOLDOWN_MS).toBe(300);
    expect(DANGER_SHAKE_MAX).toBe(5);
    expect(FRUIT_RESTITUTION).toBe(0.35);
    expect(MERGE_DELAY_SEC).toBe(0.3);
    expect(COMBO_WINDOW_FRAMES).toBe(120);
  });

  it('피버 튜닝값(지속·배율·쿨다운·콤보창·폭발반경·정리상한)이 의도와 일치한다', () => {
    expect(FEVER_DURATION_SEC).toBe(30);
    expect(FEVER_SCORE_MULT).toBe(3);
    expect(FEVER_DROP_COOLDOWN_MS).toBe(120);
    expect(FEVER_COMBO_WINDOW_FRAMES).toBe(360);
    expect(FEVER_BLAST_RADIUS).toBe(240);
    expect(FEVER_BLAST_MAX_LEVEL).toBe(6);
  });
});
