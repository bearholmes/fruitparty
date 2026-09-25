import { describe, it, expect } from 'vitest';
import {
  DEADLINE_Y,
  OVER_LIMIT_SEC,
  DROP_COOLDOWN_MS,
  DANGER_SHAKE_MAX,
  FRUIT_RESTITUTION,
} from './constants';

/* 의도된 난이도 튜닝값 — 리밸런싱 시 이 기대값도 함께 갱신할 것 */
describe('constants', () => {
  it('난이도 튜닝값(데드라인·유예·쿨다운·흔들기)이 의도와 일치한다', () => {
    expect(DEADLINE_Y).toBe(150);
    expect(OVER_LIMIT_SEC).toBe(1.5);
    expect(DROP_COOLDOWN_MS).toBe(350);
    expect(DANGER_SHAKE_MAX).toBe(5);
    expect(FRUIT_RESTITUTION).toBe(0.35);
  });
});
