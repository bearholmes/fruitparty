import { describe, it, expect } from 'vitest';
import { refreshFeverT } from './fever';
import { FEVER_DURATION_SEC, FEVER_EXTEND_SEC, FEVER_MAX_SEC } from '../config/fever';

describe('refreshFeverT', () => {
  it('피버 중이 아니면 새로 시작한다', () => {
    expect(refreshFeverT(0)).toBe(FEVER_DURATION_SEC);
    expect(refreshFeverT(-1)).toBe(FEVER_DURATION_SEC);
  });

  it('피버 중이면 리셋이 아닌 연장한다', () => {
    expect(refreshFeverT(10)).toBe(10 + FEVER_EXTEND_SEC);
    expect(refreshFeverT(FEVER_DURATION_SEC)).toBe(FEVER_DURATION_SEC + FEVER_EXTEND_SEC);
  });

  it('연장 합산이 상한을 넘으면 잘린다', () => {
    expect(refreshFeverT(FEVER_MAX_SEC - 10)).toBe(FEVER_MAX_SEC);
    expect(refreshFeverT(FEVER_MAX_SEC)).toBe(FEVER_MAX_SEC);
    expect(refreshFeverT(FEVER_MAX_SEC + 100)).toBe(FEVER_MAX_SEC);
  });
});
