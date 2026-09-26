import { describe, expect, it, vi } from 'vitest';
import { addScore } from '../../../db/leaderboard';
import { POST } from './route';

vi.mock('../../../db/leaderboard', () => ({
  addScore: vi.fn(),
  top20: vi.fn(),
}));

describe('leaderboard POST', () => {
  const submissionId = '44444444-4444-4444-8444-444444444444';

  it('다시하기에서 사용하는 unknown 이름을 등록한다', async () => {
    vi.mocked(addScore).mockResolvedValue([{ name: 'unknown', score: 50, maxCombo: 4 }]);
    const request = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: 'unknown', score: 50, maxCombo: 4, submissionId }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(addScore).toHaveBeenCalledWith('unknown', 50, 4, submissionId);
  });

  it('8자 이름은 허용하고 9자 이름은 거절한다', async () => {
    vi.mocked(addScore).mockClear();
    const accepted = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: 'abcdefgh', score: 50, maxCombo: 4, submissionId }),
    });
    vi.mocked(addScore).mockResolvedValue([{ name: 'abcdefgh', score: 50, maxCombo: 4 }]);
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
    vi.mocked(addScore).mockResolvedValue([{ name: '철수', score: 50, maxCombo: null }]);
    const request = new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name: '철수', score: 50, submissionId }),
    });

    expect((await POST(request)).status).toBe(201);
    expect(addScore).toHaveBeenCalledWith('철수', 50, null, submissionId);
  });
});
