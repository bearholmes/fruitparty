ALTER TABLE `leaderboard` ADD `submission_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_submission_id_unique` ON `leaderboard` (`submission_id`);