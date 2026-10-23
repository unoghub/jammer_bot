import * as v from "valibot";

const discordId = v.pipe(v.string(), v.regex(/^\d{17,20}$/));
const channelName = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100));
const optionalDiscordId = v.optional(v.pipe(v.string(), v.transform((value) => value.trim() || undefined), v.optional(discordId)));
const optionalToken = v.optional(v.pipe(v.string(), v.transform((value) => value.trim() || undefined), v.optional(v.string())));

const schema = v.pipe(
  v.object({
    DISCORD_TOKEN: v.pipe(v.string(), v.minLength(1)),
    DISCORD_CLIENT_ID: discordId,
    DISCORD_GUILD_ID: optionalDiscordId,
    TURSO_DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
    TURSO_AUTH_TOKEN: optionalToken,
    VERIFIED_ROLE_ID: discordId,
    JAM_PARTICIPANT_ROLE_ID: discordId,
    JAM_MAINTAINER_ROLE_ID: discordId,
    JAM_CATEGORY_NAME: channelName,
    JAM_ARCHIVE_CATEGORY_NAME: channelName,
    JAM_TEAM_LIST_CHANNEL_NAME: channelName,
    JAM_CATEGORY_ID: optionalDiscordId,
    JAM_ARCHIVE_CATEGORY_ID: optionalDiscordId,
    JAM_TEAM_LIST_CHANNEL_ID: optionalDiscordId,
    JAM_MAX_TEAM_MEMBERS: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1), v.maxValue(97)),
    NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "development"),
  }),
  v.check(
    (value) => new Set([value.VERIFIED_ROLE_ID, value.JAM_PARTICIPANT_ROLE_ID, value.JAM_MAINTAINER_ROLE_ID]).size === 3,
    "Verified, participant and maintainer roles must be different",
  ),
  v.check(
    (value) => value.JAM_CATEGORY_NAME !== value.JAM_ARCHIVE_CATEGORY_NAME &&
      (!value.JAM_CATEGORY_ID || value.JAM_CATEGORY_ID !== value.JAM_ARCHIVE_CATEGORY_ID),
    "Active and archive categories must be different",
  ),
  v.check(
    (value) => value.NODE_ENV !== "development" || Boolean(value.DISCORD_GUILD_ID),
    "DISCORD_GUILD_ID is required in development",
  ),
  v.check(
    (value) => value.TURSO_DATABASE_URL.startsWith("file:") || value.TURSO_DATABASE_URL === ":memory:" || Boolean(value.TURSO_AUTH_TOKEN),
    "TURSO_AUTH_TOKEN is required for a remote database",
  ),
);

export type Config = Readonly<{
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
  tursoDatabaseUrl: string;
  tursoAuthToken?: string;
  verifiedRoleId: string;
  jamParticipantRoleId: string;
  jamMaintainerRoleId: string;
  jamCategoryName: string;
  jamArchiveCategoryName: string;
  jamTeamListChannelName: string;
  jamCategoryId?: string;
  jamArchiveCategoryId?: string;
  jamTeamListChannelId?: string;
  jamMaxTeamMembers: number;
  nodeEnv: "development" | "production" | "test";
}>;

export function loadConfig(env: Record<string, string | undefined> = Bun.env): Config {
  const result = v.safeParse(schema, env);
  if (!result.success) {
    const issues = result.issues.map((issue) => {
      const field = issue.path?.map((item) => item.key).join(".") ?? "config";
      return `${field}: ${issue.message}`;
    });
    throw new Error(`Invalid configuration: ${issues.join("; ")}`);
  }
  return {
    discordToken: result.output.DISCORD_TOKEN,
    discordClientId: result.output.DISCORD_CLIENT_ID,
    discordGuildId: result.output.DISCORD_GUILD_ID,
    tursoDatabaseUrl: result.output.TURSO_DATABASE_URL,
    tursoAuthToken: result.output.TURSO_AUTH_TOKEN,
    verifiedRoleId: result.output.VERIFIED_ROLE_ID,
    jamParticipantRoleId: result.output.JAM_PARTICIPANT_ROLE_ID,
    jamMaintainerRoleId: result.output.JAM_MAINTAINER_ROLE_ID,
    jamCategoryName: result.output.JAM_CATEGORY_NAME,
    jamArchiveCategoryName: result.output.JAM_ARCHIVE_CATEGORY_NAME,
    jamTeamListChannelName: result.output.JAM_TEAM_LIST_CHANNEL_NAME,
    jamCategoryId: result.output.JAM_CATEGORY_ID,
    jamArchiveCategoryId: result.output.JAM_ARCHIVE_CATEGORY_ID,
    jamTeamListChannelId: result.output.JAM_TEAM_LIST_CHANNEL_ID,
    jamMaxTeamMembers: result.output.JAM_MAX_TEAM_MEMBERS,
    nodeEnv: result.output.NODE_ENV,
  };
}
