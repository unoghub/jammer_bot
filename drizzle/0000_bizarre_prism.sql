CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`log_channel_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jam_participants` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`joined_at` integer
);
--> statement-breakpoint
CREATE TABLE `jam_team_channels` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`team_id` text NOT NULL,
	`channel_type` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jam_team_member_requests` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer,
	`expires_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `jam_participants`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `jam_teams` (
	`team_id` text PRIMARY KEY NOT NULL,
	`created_at` integer
);
