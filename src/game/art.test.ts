import { describe, it, expect } from 'vitest';
import { FRUITS, MAX_LEVEL, DROP_POOL, randDrop, FEVER_DROP_POOL, randFeverDrop } from './art';
import { MAX_DROP_LEVEL, DROP_WEIGHTS } from './config/drops';
import { FEVER_MIN_DROP_LEVEL, FEVER_MAX_DROP_LEVEL, FEVER_DROP_WEIGHTS } from './config/fever';

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

  it('드롭 풀은 MAX_DROP_LEVEL 이하만 포함한다', () => {
    expect(DROP_POOL.length).toBeGreaterThan(0);
    for (const lv of DROP_POOL) {
      expect(Number.isInteger(lv)).toBe(true);
      expect(lv).toBeGreaterThanOrEqual(0);
      expect(lv).toBeLessThanOrEqual(MAX_DROP_LEVEL);
    }
    expect(Math.max(...DROP_POOL)).toBe(MAX_DROP_LEVEL);
  });

  it('드롭 풀은 레벨별 가중치대로 펼쳐진다', () => {
    const counts = DROP_POOL.reduce<Record<number, number>>((acc, lv) => {
      acc[lv] = (acc[lv] ?? 0) + 1;
      return acc;
    }, {});
    DROP_WEIGHTS.forEach((w, lv) => {
      expect(counts[lv] ?? 0).toBe(lv <= MAX_DROP_LEVEL ? w : 0);
    });
  });

  it('randDrop은 풀 안에서만 뽑는다', () => {
    for (let i = 0; i < 300; i++) {
      expect(DROP_POOL).toContain(randDrop());
    }
  });

  it('피버 드롭 풀은 [MIN, MAX] 구간만 포함한다', () => {
    expect(FEVER_DROP_POOL.length).toBeGreaterThan(0);
    for (const lv of FEVER_DROP_POOL) {
      expect(Number.isInteger(lv)).toBe(true);
      expect(lv).toBeGreaterThanOrEqual(FEVER_MIN_DROP_LEVEL);
      expect(lv).toBeLessThanOrEqual(FEVER_MAX_DROP_LEVEL);
    }
    expect(Math.min(...FEVER_DROP_POOL)).toBe(FEVER_MIN_DROP_LEVEL);
    expect(Math.max(...FEVER_DROP_POOL)).toBe(FEVER_MAX_DROP_LEVEL);
  });

  it('피버 드롭 풀은 레벨별 가중치대로 펼쳐진다', () => {
    const counts = FEVER_DROP_POOL.reduce<Record<number, number>>((acc, lv) => {
      acc[lv] = (acc[lv] ?? 0) + 1;
      return acc;
    }, {});
    FEVER_DROP_WEIGHTS.forEach((w, lv) => {
      const inWindow = lv >= FEVER_MIN_DROP_LEVEL && lv <= FEVER_MAX_DROP_LEVEL;
      expect(counts[lv] ?? 0).toBe(inWindow ? w : 0);
    });
  });

  it('randFeverDrop은 피버 풀 안에서만 뽑는다', () => {
    for (let i = 0; i < 300; i++) {
      expect(FEVER_DROP_POOL).toContain(randFeverDrop());
    }
  });
});
