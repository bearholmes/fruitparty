import { describe, it, expect } from 'vitest';
import { FRUITS, MAX_LEVEL, DROP_POOL, randDrop, FEVER_DROP_POOL, randFeverDrop } from './art';

describe('art', () => {
  it('과일은 10단계이며 반경·점수가 단조 증가한다', () => {
    expect(FRUITS).toHaveLength(10);
    expect(MAX_LEVEL).toBe(FRUITS.length - 1);
    for (let i = 1; i < FRUITS.length; i++) {
      expect(FRUITS[i].r).toBeGreaterThan(FRUITS[i - 1].r);
      expect(FRUITS[i].score).toBeGreaterThan(FRUITS[i - 1].score);
    }
  });

  it('10개 과일 이름이 서로 다르다', () => {
    expect(new Set(FRUITS.map((f) => f.name)).size).toBe(10);
  });

  it('모든 과일에 팔레트 4색이 있다', () => {
    for (const f of FRUITS) {
      expect(Object.keys(f.pal).sort()).toEqual(['bot', 'line', 'mid', 'top']);
    }
  });

  it('드롭 풀은 1~5단계(인덱스 0~4)만 포함한다', () => {
    expect(DROP_POOL.length).toBeGreaterThan(0);
    for (const lv of DROP_POOL) {
      expect(Number.isInteger(lv)).toBe(true);
      expect(lv).toBeGreaterThanOrEqual(0);
      expect(lv).toBeLessThanOrEqual(4);
    }
  });

  it('randDrop은 풀 안에서만 뽑는다', () => {
    for (let i = 0; i < 300; i++) {
      expect(DROP_POOL).toContain(randDrop());
    }
  });

  it('피버 드롭 풀은 3~6단계(인덱스 2~5)만 포함한다', () => {
    expect(FEVER_DROP_POOL.length).toBeGreaterThan(0);
    for (const lv of FEVER_DROP_POOL) {
      expect(Number.isInteger(lv)).toBe(true);
      expect(lv).toBeGreaterThanOrEqual(2);
      expect(lv).toBeLessThanOrEqual(5);
    }
  });

  it('randFeverDrop은 피버 풀 안에서만 뽑는다', () => {
    for (let i = 0; i < 300; i++) {
      expect(FEVER_DROP_POOL).toContain(randFeverDrop());
    }
  });
});
