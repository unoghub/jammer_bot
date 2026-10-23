ALTER TABLE `game_jams` DROP COLUMN `list_needs_sync`;--> statement-breakpoint
ALTER TABLE `jam_participants` DROP COLUMN `needs_sync`;--> statement-breakpoint
ALTER TABLE `jam_teams` DROP COLUMN `needs_sync`;