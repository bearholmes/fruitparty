import { describe, expect, it } from 'vitest';
import { qualifiesForLeaderboard } from './leaderboard';

describe('베스트 20 진입', () => {
  it('빈 순위표에는 양수 점수만 등록한다', () => {
    expect(qualifiesForLeaderboard(0, [])).toBe(false);
    expect(qualifiesForLeaderboard(1, [])).toBe(true);
  });

  it('20위 점수보다 높을 때만 진입한다', () => {
    const entries = Array.from({ length: 20 }, (_, index) => ({
      name: '테스트',
      score: 100 - index,
      maxCombo: null,
    }));
    expect(qualifiesForLeaderboard(81, entries)).toBe(false);
    expect(qualifiesForLeaderboard(82, entries)).toBe(true);
  });
});
