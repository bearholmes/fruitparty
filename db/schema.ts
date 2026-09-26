import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const leaderboard = sqliteTable('leaderboard', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  score: integer('score').notNull(),
  maxCombo: integer('max_combo'),
  createdAt: text('created_at'),
  submissionId: text('submission_id').unique(),
});
