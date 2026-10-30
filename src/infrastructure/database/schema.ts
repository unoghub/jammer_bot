import { sql } from "drizzle-orm";
import {
  primaryKey,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const guildSettings = sqliteTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const jamParticipants = sqliteTable("jam_participants", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  joinedAt: integer("joined_at", { mode: "timestamp" }),
});

export const jamTeams = sqliteTable("jam_teams", {
  teamId: text("team_id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const jamTeamChannels = sqliteTable("jam_team_channels", {
  channelId: text("channel_id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  teamId: text("team_id")
    .notNull()
    .references(() => jamTeams.teamId, { onDelete: "cascade" }),
  channelType: text("channel_type", {
    enum: ["text", "voice"],
  }).notNull(),
});

export const jamTeamMembers = sqliteTable(
  "jam_team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => jamTeams.teamId),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => jamParticipants.userId),
    isOwner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);
