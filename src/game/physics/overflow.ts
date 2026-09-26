/* 데드라인 정체 판정 — 선 위에서 느리게 머문 시간을 누적 */

import { FRUITS } from '../fruits';
import { DEADLINE_Y, OVER_LIMIT_SEC } from '../config/board';
import { OVERFLOW_STILL_VY } from '../config/physics';

export interface OverflowBody {
  id: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

export function updateOverflow(
  bodies: OverflowBody[],
  levelOf: (b: OverflowBody) => number,
  overTime: Map<number, number>,
  dt: number,
): { maxT: number; overflowed: boolean } {
  let maxT = 0;
  for (const b of bodies) {
    const lv = levelOf(b);
    if (
      b.position.y - FRUITS[lv].r * FRUITS[lv].hitbox.y < DEADLINE_Y &&
      Math.abs(b.velocity.y) < OVERFLOW_STILL_VY
    ) {
      const t = (overTime.get(b.id) ?? 0) + dt;
      overTime.set(b.id, t);
      if (t > maxT) maxT = t;
      if (t > OVER_LIMIT_SEC) return { maxT: t, overflowed: true };
    } else {
      overTime.set(b.id, 0);
    }
  }
  return { maxT, overflowed: false };
}
