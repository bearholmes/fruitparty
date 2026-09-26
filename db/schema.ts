import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const leaderboard = sqliteTable(
  'leaderboard',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    score: integer('score').notNull(),
    maxCombo: integer('max_combo'),
    feverCount: integer('fever_count'),
    createdAt: text('created_at'),
    submissionId: text('submission_id').unique(),
  },
  (t) => [
    // TOP20·20위 커트라인 조회용 (created_at은 ISO 텍스트라 사전순=시간순)
    // SQLite는 역방향 스캔을 지원하므로 ASC 인덱스로 DESC 정렬을 커버
    index('leaderboard_score_idx').on(t.score, t.id),
    index('leaderboard_created_score_idx').on(t.createdAt, t.score, t.id),
  ],
);
