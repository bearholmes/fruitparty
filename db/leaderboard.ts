import { env } from 'cloudflare:workers';
import { periodStarts } from './periods';

export interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number | null;
  feverCount: number | null;
  createdAt: string | null;
}

export interface LeaderboardBoards {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  all: LeaderboardEntry[];
}

function database(): D1Database {
  if (!env.DB) throw new Error('D1 database binding is unavailable');
  return env.DB;
}

export async function top20Boards(now = new Date()): Promise<LeaderboardBoards> {
  const db = database();
  const start = periodStarts(now);
  const [daily, weekly, all] = await Promise.all([
    db.prepare('SELECT name, score, max_combo AS maxCombo, fever_count AS feverCount, created_at AS createdAt FROM leaderboard WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT 20')
      .bind(start.daily).all<LeaderboardEntry>(),
    db.prepare('SELECT name, score, max_combo AS maxCombo, fever_count AS feverCount, created_at AS createdAt FROM leaderboard WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT 20')
      .bind(start.weekly).all<LeaderboardEntry>(),
    db.prepare('SELECT name, score, max_combo AS maxCombo, fever_count AS feverCount, created_at AS createdAt FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20')
      .all<LeaderboardEntry>(),
  ]);
  return { daily: daily.results, weekly: weekly.results, all: all.results };
}

/* 20위 커트라인 점수 — 행이 20개 미만이면 null.
   top20Boards와 동일한 정렬이라 entries[19].score와 일치 */
async function twentiethScore(db: D1Database, since: string | null): Promise<number | null> {
  const row = since === null
    ? await db.prepare('SELECT score FROM leaderboard ORDER BY score DESC, id ASC LIMIT 1 OFFSET 19').first<{ score: number }>()
    : await db.prepare('SELECT score FROM leaderboard WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT 1 OFFSET 19').bind(since).first<{ score: number }>();
  return row?.score ?? null;
}

export async function addScore(name: string, score: number, maxCombo: number | null, feverCount: number | null, submissionId: string): Promise<LeaderboardBoards | null> {
  const db = database();
  const now = new Date();
  const duplicate = await db.prepare('SELECT id FROM leaderboard WHERE submission_id = ?').bind(submissionId).first();
  if (duplicate) return top20Boards(now);
  // 사전 검사는 20행 풀스캔 대신 커트라인 1행 조회 3개로 (인덱스 활용)
  const start = periodStarts(now);
  const [dailyBar, weeklyBar, allBar] = await Promise.all([
    twentiethScore(db, start.daily),
    twentiethScore(db, start.weekly),
    twentiethScore(db, null),
  ]);
  const clears = (bar: number | null) => score > 0 && (bar === null || score > bar);
  if (!clears(dailyBar) && !clears(weeklyBar) && !clears(allBar)) return null;
  await db
    .prepare('INSERT INTO leaderboard (name, score, max_combo, fever_count, submission_id, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING')
    .bind(name, score, maxCombo, feverCount, submissionId, now.toISOString())
    .run();
  return top20Boards(now);
}
