ALTER TABLE `team` ADD `unconfirmed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `team` ADD `number` integer;--> statement-breakpoint
ALTER TABLE `team` ADD `contest_password` text;--> statement-breakpoint
CREATE UNIQUE INDEX `team_number_unique` ON `team` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_contest_password_unique` ON `team` (`contest_password`);