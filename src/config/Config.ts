import * as v from "valibot";

const schema = v.pipe(
  v.object({
    DISCORD_TOKEN: v.pipe(v.string(), v.minLength(1)),
    DISCORD_CLIENT_ID: v.pipe(v.string(), v.regex(/^\d{17,20}$/)),
    DISCORD_GUILD_ID: v.optional(v.pipe(v.string(), v.regex(/^\d{17,20}$/))),
    TURSO_DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
    TURSO_AUTH_TOKEN: v.optional(v.pipe(v.string(), v.minLength(1))),
    NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "development"),
  }),
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
  nodeEnv: "development" | "production" | "test";
}>;

export function loadConfig(env: Record<string, string | undefined> = Bun.env): Config {
  const result = v.safeParse(schema, env);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.issues.map((issue) => issue.message).join("; ")}`);
  }
  return {
    discordToken: result.output.DISCORD_TOKEN,
    discordClientId: result.output.DISCORD_CLIENT_ID,
    discordGuildId: result.output.DISCORD_GUILD_ID,
    tursoDatabaseUrl: result.output.TURSO_DATABASE_URL,
    tursoAuthToken: result.output.TURSO_AUTH_TOKEN,
    nodeEnv: result.output.NODE_ENV,
  };
}
