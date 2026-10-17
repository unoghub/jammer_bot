# unogjambot

A modular Discord bot foundation built with TypeScript, Bun, discord.js v14, tsyringe, Valibot, and Pino. It includes `/ping` and `/ban` as examples of the command pipeline and feature based modules.

## Setup

1. Run `bun install`.
2. Copy `.env.example` to `.env` and fill in the bot token, application ID, Turso database URL, and auth token. Set `DISCORD_GUILD_ID` for development.
3. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Ban Members** for `/ban`, and keep its role above members it should ban.
4. Run `bun run src/main.ts` or `bun run start`. Use `bun run dev` for watch mode and `bun run typecheck` for strict TypeScript validation.

`NODE_ENV=development` deploys commands to `DISCORD_GUILD_ID` on startup. `NODE_ENV=production` deploys global commands. Guild commands generally become available sooner. Command deployment replaces the commands for the selected scope, so use a dedicated development guild. A deploy failure stops startup before Discord login.

Only `src/config/Config.ts` reads environment variables at runtime. Required values are validated before services are created. The bot checks the database connection before deploying commands and logging in to Discord. The bot cannot connect without real Discord credentials.

## Database

The shared `DatabaseService` exposes its Drizzle client as `db`. Inject it into a feature service through its constructor, then use `database.db` for queries. `src/infrastructure/database/schema.ts` includes a small `guildSettings` example with a guild ID, an optional log channel ID, and a creation timestamp. Add and export further tables there; keep feature-specific queries in that feature's service or repository. The example table is not used by a command yet.

After changing the schema, run `bun run db:generate` to create SQL migrations. Review the generated SQL, commit the new files under `drizzle/`, and run `bun run db:migrate` against your development database. Use a separate local or development Turso database; do not put production database credentials in developer `.env` files.

For local development without a Turso account, set `TURSO_DATABASE_URL=file:local.sqlite` and omit `TURSO_AUTH_TOKEN`. For a hosted Turso database, use its `libsql://` URL and token. Local SQLite files are ignored by Git.

## Dokploy deployment

Create an **Application** in Dokploy, select this repository and the production branch, and choose the Dockerfile build type with `./Dockerfile`. In the application's Environment settings, provide `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` for production. The image sets `NODE_ENV=production`. This bot does not serve HTTP, so it needs no domain or published port.

When the container starts, it applies committed Drizzle migrations to the production Turso database before starting the bot. If migration fails, the bot does not start; inspect the application logs before retrying. Drizzle records applied migrations, so a restart checks for new migrations without reapplying completed ones. The image includes `drizzle-kit` and its development dependencies because migration runs inside the bot container.

Run one bot instance with this startup migration approach. For schema changes that remove or rename columns, deploy compatible application code and data changes in stages so any old container continues to work while the migration runs. Back up production data before destructive changes. If the production database already contains tables created outside these Drizzle migrations, reconcile its schema and migration history before the first Dokploy deployment; the initial migration may otherwise try to create an existing table.

## Structure

```text
src/
  app/                  Composition root, bootstrap, lifecycle, ready event
  config/               Validated configuration and DI tokens
  core/
    commands/           Base command, context, registry, handler
    cooldowns/          In-memory per-user command cooldowns
    errors/             Application errors and safe Discord responses
    events/             Event registration and listener lifecycle
    guards/             Authorization checks
    middleware/         Global command middleware pipeline
  infrastructure/
    discord/            Client, interaction router, command deployment
    database/           Drizzle/libSQL connection and schema
    logger/             Logger interface and Pino adapter
  modules/
    utility/            Ping command
    moderation/         Ban command, administrator guard, service
  main.ts               Startup and signal handling
```

## Execution flow

```text
DiscordClient → InteractionRouter → CommandHandler
                                   ├─ CommandRegistry
                                   ├─ GuardRunner
                                   ├─ CooldownManager
                                   ├─ MiddlewareRunner → Command.execute() → Service → Discord API
                                   └─ ErrorHandler
```

`src/app/container.ts` constructs shared infrastructure. `src/app/bootstrap.ts` explicitly registers middleware, events, and modules. Module registration functions resolve their commands and place them in `CommandRegistry`. Application classes receive dependencies through constructors; commands and services do not access the container. The bot attaches listeners, deploys commands once at startup, logs in, and closes the Discord client on `SIGINT` or `SIGTERM`.

Cooldown values are **milliseconds**, scoped by command name and user ID, and held in memory. A process restart clears them. Guards run before a cooldown is acquired. Middleware wraps command execution. Known `BotError` messages can be shown to users; unexpected errors are logged and receive a generic response.

## Extend the bot

**Command:** Add a class extending `Command` in a feature module's `commands/` directory. Define a `SlashCommandBuilder` and `execute(context)`. Inject needed services in the constructor. Register the resolved command in the module's `index.ts` function. Optional `cooldown` values use milliseconds; optional `guards` contain injected guard instances.

**Module:** Create `src/modules/<feature>/` with its own commands, services, guards, events, and later repositories as needed. Export a `register<Feature>Module(container)` function. Call it explicitly from `src/app/bootstrap.ts`.

**Guard:** Implement `Guard.check(context)` and return `{ allowed: true }` or `{ allowed: false, message }`. Inject the guard into the command constructor and include it in the command's `guards` array. `GuardRunner` executes guards in declaration order.

**Service:** Put the service inside its feature module, mark it `@injectable()`, and inject it into commands or other services. If it later needs persistence, define a domain-specific repository interface and register its implementation behind a Symbol token in the composition root. `ModerationService` is a concrete example of keeping the Discord ban call out of `BanCommand`.

**Event:** Extend `Event<"eventName">`, implement `execute`, and register it in `EventRegistry` during bootstrap. `EventHandler` manages Discord listener attachment and removal.
