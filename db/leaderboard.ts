import { env } from 'cloudflare:workers';

export interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number | null;
}

function database(): D1Database {
  if (!env.DB) throw new Error('D1 database binding is unavailable');
  return env.DB;
}

export async function top20(): Promise<LeaderboardEntry[]> {
  const result = await database()
    .prepare('SELECT name, score, max_combo AS maxCombo FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20')
    .all<LeaderboardEntry>();
  return result.results;
}

export async function addScore(name: string, score: number, maxCombo: number | null, submissionId: string): Promise<LeaderboardEntry[] | null> {
  const db = database();
  const result = await db
    .prepare(`INSERT INTO leaderboard (name, score, max_combo, submission_id)
      SELECT ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM leaderboard) < 20
         OR ? > (SELECT MIN(score) FROM
           (SELECT score FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20))
      ON CONFLICT(submission_id) DO NOTHING`)
    .bind(name, score, maxCombo, submissionId, score)
    .run();
  if (!result.meta.changes) {
    const duplicate = await db.prepare('SELECT id FROM leaderboard WHERE submission_id = ?').bind(submissionId).first();
    return duplicate ? top20() : null;
  }
  await db
    .prepare(`DELETE FROM leaderboard WHERE id NOT IN
      (SELECT id FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20)`)
    .run();
  return top20();
}
