PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jam_team_member_requests` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer,
	`expires_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `jam_participants`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_jam_team_member_requests`("team_id", "user_id", "type", "created_at", "expires_at") SELECT "team_id", "user_id", "type", "created_at", "expires_at" FROM `jam_team_member_requests`;--> statement-breakpoint
DROP TABLE `jam_team_member_requests`;--> statement-breakpoint
ALTER TABLE `__new_jam_team_member_requests` RENAME TO `jam_team_member_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_jam_team_members` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `jam_participants`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_jam_team_members`("team_id", "user_id", "is_owner") SELECT "team_id", "user_id", "is_owner" FROM `jam_team_members`;--> statement-breakpoint
DROP TABLE `jam_team_members`;--> statement-breakpoint
ALTER TABLE `__new_jam_team_members` RENAME TO `jam_team_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `jam_team_members_user_id_unique` ON `jam_team_members` (`user_id`);