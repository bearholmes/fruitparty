import { env } from 'cloudflare:workers';
import { periodStarts } from './periods';

export interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number | null;
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
    db.prepare('SELECT name, score, max_combo AS maxCombo FROM leaderboard WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT 20')
      .bind(start.daily).all<LeaderboardEntry>(),
    db.prepare('SELECT name, score, max_combo AS maxCombo FROM leaderboard WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT 20')
      .bind(start.weekly).all<LeaderboardEntry>(),
    db.prepare('SELECT name, score, max_combo AS maxCombo FROM leaderboard ORDER BY score DESC, id ASC LIMIT 20')
      .all<LeaderboardEntry>(),
  ]);
  return { daily: daily.results, weekly: weekly.results, all: all.results };
}

function qualifies(score: number, entries: LeaderboardEntry[]): boolean {
  return score > 0 && (entries.length < 20 || score > entries[19].score);
}

export async function addScore(name: string, score: number, maxCombo: number | null, submissionId: string): Promise<LeaderboardBoards | null> {
  const db = database();
  const now = new Date();
  const duplicate = await db.prepare('SELECT id FROM leaderboard WHERE submission_id = ?').bind(submissionId).first();
  if (duplicate) return top20Boards(now);
  const boards = await top20Boards(now);
  if (!qualifies(score, boards.daily) && !qualifies(score, boards.weekly) && !qualifies(score, boards.all)) return null;
  await db
    .prepare('INSERT INTO leaderboard (name, score, max_combo, submission_id, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING')
    .bind(name, score, maxCombo, submissionId, now.toISOString())
    .run();
  return top20Boards(now);
}
