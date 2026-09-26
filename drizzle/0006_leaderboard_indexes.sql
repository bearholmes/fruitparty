CREATE INDEX `leaderboard_score_idx` ON `leaderboard` (`score` DESC, `id`);--> statement-breakpoint
CREATE INDEX `leaderboard_created_score_idx` ON `leaderboard` (`created_at`, `score` DESC, `id`);
