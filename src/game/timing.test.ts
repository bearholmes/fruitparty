import { describe, expect, it } from 'vitest';
import { fixedSteps } from './timing';

describe('fixedSteps', () => {
  it('60Hz와 120Hz에서 같은 실제 시간 동안 같은 물리 스텝을 실행한다', () => {
    const simulate = (hz: number) => {
      let remainderMs = 0;
      let steps = 0;
      for (let frame = 0; frame < hz; frame++) {
        const next = fixedSteps(1000 / hz, remainderMs);
        steps += next.steps;
        remainderMs = next.remainderMs;
      }
      return steps;
    };
    expect(simulate(60)).toBe(60);
    expect(simulate(120)).toBe(60);
  });

  it('긴 화면 중단 뒤 한 번에 과도하게 물리를 진행하지 않는다', () => {
    expect(fixedSteps(1000, 0).steps).toBe(6);
  });
});
