import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// örnek schema
// https://orm.drizzle.team/docs/sql-schema-declaration
export const guildSettings = sqliteTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
