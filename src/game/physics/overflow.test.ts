import { describe, it, expect } from 'vitest';
import { updateOverflow, type OverflowBody } from './overflow';
import { DEADLINE_Y, OVER_LIMIT_SEC } from '../config/board';

function fruit(id: number, y: number, vy = 0): OverflowBody {
  return { id, position: { x: 210, y }, velocity: { x: 0, y: vy } };
}

describe('updateOverflow', () => {
  it('데드라인 아래 과일은 시간을 누적하지 않는다', () => {
    const overTime = new Map<number, number>();
    const r = updateOverflow([fruit(1, DEADLINE_Y + 100)], () => 0, overTime, 0.016);
    expect(r).toEqual({ maxT: 0, overflowed: false });
    expect(overTime.get(1)).toBe(0);
  });

  it('선 위에서 느리면 시간을 누적하고 제한을 넘기면 오버플로우다', () => {
    const overTime = new Map<number, number>();
    const bodies = [fruit(1, DEADLINE_Y - 50, 0.1)];
    const r1 = updateOverflow(bodies, () => 0, overTime, 1);
    expect(r1.overflowed).toBe(false);
    expect(r1.maxT).toBeCloseTo(1);
    const r2 = updateOverflow(bodies, () => 0, overTime, OVER_LIMIT_SEC);
    expect(r2.overflowed).toBe(true);
  });

  it('빨리 떨어지는 과일은 정체로 보지 않고 리셋한다', () => {
    const overTime = new Map<number, number>([[1, 2]]);
    const r = updateOverflow([fruit(1, DEADLINE_Y - 50, 5)], () => 0, overTime, 0.016);
    expect(r.overflowed).toBe(false);
    expect(overTime.get(1)).toBe(0);
  });

  it('여러 과일 중 최대 정체 시간을 반환한다', () => {
    const overTime = new Map<number, number>([[2, 1.5]]);
    const r = updateOverflow(
      [fruit(1, DEADLINE_Y - 50, 0), fruit(2, DEADLINE_Y - 50, 0)],
      () => 0,
      overTime,
      0.5,
    );
    expect(r.maxT).toBeCloseTo(2);
  });
});
