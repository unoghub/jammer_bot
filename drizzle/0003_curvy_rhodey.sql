CREATE TABLE `jam_team_members` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `jam_participants`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jam_team_members_user_id_unique` ON `jam_team_members` (`user_id`);--> statement-breakpoint
ALTER TABLE `jam_teams` DROP COLUMN `user_id`;