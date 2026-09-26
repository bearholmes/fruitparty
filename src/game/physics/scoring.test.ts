import { describe, it, expect } from 'vitest';
import { FRUITS } from '../fruits';
import { mergeScore } from './scoring';

describe('scoring', () => {
  it('합체 점수는 새 과일 기본점이다', () => {
    expect(mergeScore(1, 0, false)).toBe(FRUITS[1].score);
    expect(mergeScore(5, 0, false)).toBe(FRUITS[5].score);
  });

  it('콤보 1당 50%씩 가산한다', () => {
    expect(mergeScore(1, 2, false)).toBe(Math.round(FRUITS[1].score * 2));
    expect(mergeScore(2, 4, false)).toBe(Math.round(FRUITS[2].score * 3));
  });

  it('피버면 3배를 곱한다', () => {
    expect(mergeScore(1, 0, true)).toBe(FRUITS[1].score * 3);
    expect(mergeScore(1, 2, true)).toBe(Math.round(FRUITS[1].score * 2 * 3));
  });
});
