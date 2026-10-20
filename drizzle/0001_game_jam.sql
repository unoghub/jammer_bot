CREATE TABLE `game_jams` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`participant_role_id` text NOT NULL,
	`maintainer_role_id` text NOT NULL,
	`category_id` text,
	`archive_category_id` text,
	`team_list_channel_id` text,
	`list_needs_sync` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jam_blacklist` (
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`guild_id`, `user_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `game_jams`(`guild_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jam_participants` (
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`needs_sync` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`guild_id`, `user_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `game_jams`(`guild_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jam_team_members` (
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`guild_id`, `user_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `game_jams`(`guild_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jam_team_members_team_idx` ON `jam_team_members` (`team_id`);--> statement-breakpoint
CREATE TABLE `jam_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`active_name` text,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'creating' NOT NULL,
	`text_channel_id` text,
	`voice_channel_id` text,
	`archived_member_ids` text NOT NULL,
	`needs_sync` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`guild_id`) REFERENCES `game_jams`(`guild_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jam_team_name_unique` ON `jam_teams` (`guild_id`,`active_name`);--> statement-breakpoint
CREATE INDEX `jam_teams_guild_idx` ON `jam_teams` (`guild_id`);