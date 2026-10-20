import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const guildSettings = sqliteTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const gameJams = sqliteTable("game_jams", {
  guildId: text("guild_id").primaryKey(),
  participantRoleId: text("participant_role_id").notNull(),
  maintainerRoleId: text("maintainer_role_id").notNull(),
  categoryId: text("category_id"),
  archiveCategoryId: text("archive_category_id"),
  teamListChannelId: text("team_list_channel_id"),
  listNeedsSync: integer("list_needs_sync", { mode: "boolean" }).notNull().default(true),
});

export const jamParticipants = sqliteTable("jam_participants", {
  guildId: text("guild_id").notNull().references(() => gameJams.guildId),
  userId: text("user_id").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  needsSync: integer("needs_sync", { mode: "boolean" }).notNull().default(true),
}, (table) => [primaryKey({ columns: [table.guildId, table.userId] })]);

export const jamBlacklist = sqliteTable("jam_blacklist", {
  guildId: text("guild_id").notNull().references(() => gameJams.guildId),
  userId: text("user_id").notNull(),
  addedBy: text("added_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [primaryKey({ columns: [table.guildId, table.userId] })]);

export const jamTeams = sqliteTable("jam_teams", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => gameJams.guildId),
  name: text("name").notNull(),
  activeName: text("active_name"),
  ownerId: text("owner_id").notNull(),
  status: text("status", { enum: ["creating", "active", "archiving", "archived"] }).notNull().default("creating"),
  textChannelId: text("text_channel_id"),
  voiceChannelId: text("voice_channel_id"),
  archivedMemberIds: text("archived_member_ids", { mode: "json" }).$type<string[]>().notNull(),
  needsSync: integer("needs_sync", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
}, (table) => [
  uniqueIndex("jam_team_name_unique").on(table.guildId, table.activeName),
  index("jam_teams_guild_idx").on(table.guildId),
]);

export const jamTeamMembers = sqliteTable("jam_team_members", {
  guildId: text("guild_id").notNull().references(() => gameJams.guildId),
  userId: text("user_id").notNull(),
  teamId: text("team_id").notNull().references(() => jamTeams.id),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  primaryKey({ columns: [table.guildId, table.userId] }),
  index("jam_team_members_team_idx").on(table.teamId),
]);
