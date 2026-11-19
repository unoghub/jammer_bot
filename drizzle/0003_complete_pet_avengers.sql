PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jam_teams` (
	`team_id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	CONSTRAINT "team_id_valid" CHECK("__new_jam_teams"."team_id" <> '' AND "__new_jam_teams"."team_id" NOT GLOB '*[^a-zA-Z0-9_-]*')
);
--> statement-breakpoint
INSERT INTO `__new_jam_teams`("team_id", "created_at") SELECT "team_id", "created_at" FROM `jam_teams`;--> statement-breakpoint
DROP TABLE `jam_teams`;--> statement-breakpoint
ALTER TABLE `__new_jam_teams` RENAME TO `jam_teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;