import { describe, expect, it, vi } from 'vitest';
import { addScore, top20Boards } from '../../../db/leaderboard';
import { GET, POST } from './route';

vi.mock('../../../db/leaderboard', () => ({
  addScore: vi.fn(),
  top20Boards: vi.fn(),
}));

function boards(name: string, score: number, maxCombo: number | null) {
  const entries = [{ name, score, maxCombo, feverCount: null }];
  return { daily: entries, weekly: entries, all: entries };
}

describe('leaderboard POST', () => {
  const submissionId = '44444444-4444-4444-8444-444444444444';

  it('세 기간의 순위를 반환한다', async () => {
    const result = boards('철수', 50, 4);
    vi.mocked(top20Boards).mockResolvedValue(result);
    expect(await (await GET()).json()).toMatchObject({ boards: result, entries: result.all });
  });

  it('다시하기에서 사용하는 unknown 이름을 등록한다', async () => {
    vi.mocked(addScore).mockResolvedValue(boards('unknown', 50, 4));
    const request = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: 'unknown', score: 50, maxCombo: 4, feverCount: 3, submissionId }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(addScore).toHaveBeenCalledWith('unknown', 50, 4, 3, submissionId);
  });

  it('8자 이름은 허용하고 9자 이름은 거절한다', async () => {
    vi.mocked(addScore).mockClear();
    const accepted = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: 'abcdefgh', score: 50, maxCombo: 4, submissionId }),
    });
    vi.mocked(addScore).mockResolvedValue(boards('abcdefgh', 50, 4));
    expect((await POST(accepted)).status).toBe(201);

    vi.mocked(addScore).mockClear();
    const rejected = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: 'abcdefghi', score: 50, maxCombo: 4, submissionId }),
    });

    const response = await POST(rejected);

    expect(response.status).toBe(400);
    expect(addScore).not.toHaveBeenCalled();
  });

  it('이전 버전에서 보낸 점수는 콤보 없이도 저장한다', async () => {
    vi.mocked(addScore).mockClear();
    vi.mocked(addScore).mockResolvedValue(boards('철수', 50, null));
    const request = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: '철수', score: 50, submissionId }),
    });

    expect((await POST(request)).status).toBe(201);
    expect(addScore).toHaveBeenCalledWith('철수', 50, null, null, submissionId);
  });

  it('피버 횟수는 음수나 소수를 거절한다', async () => {
    vi.mocked(addScore).mockClear();
    for (const feverCount of [-1, 1.5]) {
      const request = new Request('http://localhost/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify({ name: '철수', score: 50, maxCombo: 4, feverCount, submissionId }),
      });
      expect((await POST(request)).status).toBe(400);
    }
    expect(addScore).not.toHaveBeenCalled();
  });
});
