CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`log_channel_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
