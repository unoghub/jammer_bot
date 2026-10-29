CREATE TABLE `jam_team_channels` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`team_id` text NOT NULL,
	`channel_type` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `jam_teams`(`team_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jam_teams` (
	`team_id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `jam_participants`(`user_id`) ON UPDATE no action ON DELETE no action
);
