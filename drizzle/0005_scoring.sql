CREATE TABLE `jury_assessment` (
	`team_id` text PRIMARY KEY NOT NULL,
	`juror_email` text NOT NULL,
	`scores` text,
	`comment` text DEFAULT '' NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `round_score` (
	`team_id` text PRIMARY KEY NOT NULL,
	`icpc` integer,
	`math` integer,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scoring_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`published_result` text
);
--> statement-breakpoint
INSERT INTO `scoring_state` (`id`, `revision`) VALUES ('event', 0);
