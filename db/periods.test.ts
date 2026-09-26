import { describe, expect, it } from 'vitest';
import { periodStarts } from './periods';

describe('한국시간 순위 집계 시작', () => {
  it('자정 전후로 일간 시작 시각이 바뀐다', () => {
    expect(periodStarts(new Date('2026-09-25T14:59:59Z')).daily).toBe('2026-09-24T15:00:00.000Z');
    expect(periodStarts(new Date('2026-09-25T15:00:00Z')).daily).toBe('2026-09-25T15:00:00.000Z');
  });

  it('월요일 0시에 주간 시작 시각이 바뀐다', () => {
    expect(periodStarts(new Date('2026-09-27T14:59:59Z')).weekly).toBe('2026-09-20T15:00:00.000Z');
    expect(periodStarts(new Date('2026-09-27T15:00:00Z')).weekly).toBe('2026-09-27T15:00:00.000Z');
  });
});
