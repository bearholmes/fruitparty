export interface LeaderboardEntry {
  name: string;
  score: number;
}

export function qualifiesForLeaderboard(score: number, entries: LeaderboardEntry[]): boolean {
  return score > 0 && (entries.length < 20 || score > entries[19].score);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch('/api/leaderboard');
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw new Error('순위표를 불러오지 못했습니다.');
  const data: { entries: LeaderboardEntry[] } = await response.json();
  return data.entries;
}

export async function submitLeaderboardScore(
  name: string,
  score: number,
  submissionId: string,
): Promise<LeaderboardEntry[]> {
  const response = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score, submissionId }),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw new Error('점수를 저장하지 못했습니다. 다시 시도해 주세요.');
  const data: { entries: LeaderboardEntry[] } = await response.json();
  return data.entries;
}
