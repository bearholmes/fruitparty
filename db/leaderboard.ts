import { env } from 'cloudflare:workers';

export interface LeaderboardEntry {
  name: string;
  score: number;
}

function database(): D1Database {
  if (!env.DB) throw new Error('D1 database binding is unavailable');
  return env.DB;
}

export async function top20(): Promise<LeaderboardEntry[]> {
  const result = await database()
    .prepare('SELECT name, score FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20')
    .all<LeaderboardEntry>();
  return result.results;
}

export async function addScore(name: string, score: number): Promise<LeaderboardEntry[] | null> {
  const db = database();
  const result = await db
    .prepare(`INSERT INTO leaderboard (name, score)
      SELECT ?, ?
      WHERE (SELECT COUNT(*) FROM leaderboard) < 20
         OR ? > (SELECT MIN(score) FROM
           (SELECT score FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20))`)
    .bind(name, score, score)
    .run();
  if (!result.meta.changes) return null;
  await db
    .prepare(`DELETE FROM leaderboard WHERE id NOT IN
      (SELECT id FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20)`)
    .run();
  return top20();
}
