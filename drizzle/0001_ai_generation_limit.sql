CREATE TABLE `ai_generation_limit` (
	`user_id` text PRIMARY KEY NOT NULL,
	`next_allowed_at` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`requests` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
