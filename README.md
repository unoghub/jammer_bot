# unogjambot

A modular Discord bot built with TypeScript, Bun, discord.js v14, tsyringe, Valibot, and Pino. It includes Game Jam participation, team channels, moderation, and the `/ping` and `/ban` example commands.

## Setup

1. Run `bun install`.
2. Copy `.env.example` to `.env` and fill in the bot credentials, database settings, `VERIFIED_ROLE_ID`, `JAM_PARTICIPANT_ROLE_ID`, and `JAM_MAINTAINER_ROLE_ID`. The Verified role is the existing role assigned by ÜNOG Bot. These three role IDs must be different; empty required IDs stop startup. Set `DISCORD_GUILD_ID` for development.
3. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Ban Members** for `/ban`, and keep its role above members it should ban. For Game Jam, grant **Manage Channels**, **Manage Roles**, **Move Members**, **View Channels**, **Send Messages**, **Read Message History**, **Connect**, and **Speak**.
4. Run `bun run db:migrate` against your development database before starting the bot.
5. Run `bun run src/main.ts` or `bun run start`. Use `bun run dev` for watch mode, `bun run typecheck` for TypeScript validation, and `bun test` for the local test suite.
6. Enable **Server Members Intent** on the bot's page in the Discord Developer Portal so Verified role changes reach the bot.
7. Run `/jam-setup` as a verified server administrator. Keep the bot's role above the participant role.

`NODE_ENV=development` deploys commands to `DISCORD_GUILD_ID` on startup. `NODE_ENV=production` deploys global commands. Guild commands generally become available sooner. Command deployment replaces the commands for the selected scope, so use a dedicated development guild. A deploy failure stops startup before Discord login.

Only `src/config/Config.ts` reads environment variables at runtime. Required values are validated before services are created. The bot checks the database connection before deploying commands and logging in to Discord. The bot cannot connect without real Discord credentials.

## Database

The shared `DatabaseService` exposes its Drizzle client as `db`. Inject it into a feature service through its constructor, then use `database.db` for queries. `src/infrastructure/database/schema.ts` includes a small `guildSettings` example with a guild ID, an optional log channel ID, and a creation timestamp. Add and export further tables there; keep feature-specific queries in that feature's service or repository. The example table is not used by a command yet.

After changing the schema, run `bun run db:generate` to create SQL migrations. Review the generated SQL, commit the new files under `drizzle/`, and run `bun run db:migrate` against your development database. Use a separate local or development Turso database; do not put production database credentials in developer `.env` files.

For local development without a Turso account, set `TURSO_DATABASE_URL=file:local.sqlite` and omit `TURSO_AUTH_TOKEN`. For a hosted Turso database, use its `libsql://` URL and token. Local SQLite files are ignored by Git.

## Game Jam

Each server has its own jam configuration, participants, blacklist, teams, and memberships. Setup uses the existing participant and maintainer roles configured in `.env`. Set `JAM_CATEGORY_NAME`, `JAM_ARCHIVE_CATEGORY_NAME`, and `JAM_TEAM_LIST_CHANNEL_NAME` there as well. The example values are **Game Jam**, **Game Jam Archives**, and **jam-teams**.

Optional `JAM_CATEGORY_ID`, `JAM_ARCHIVE_CATEGORY_ID`, and `JAM_TEAM_LIST_CHANNEL_ID` select existing channels. When omitted, setup uses saved channel IDs or creates the configured channels. `JAM_MAX_TEAM_MEMBERS` controls team capacity, up to 97 members within Discord's overwrite limit. The example uses 90. Repeating `/jam-setup` reapplies channel names and permissions to existing stored channels and refreshes the team list. It does not change the saved participant and maintainer roles.

Every slash command and modal submission requires the Verified role, including administrator commands and `/ping`. Guards check fresh member roles before execution, and modal submission checks them again. Removing Verified triggers the same participation removal as `/leavejam`. No Verified role ID is guessed or discovered by name.

In addition to the management permissions above, enable the bot's text and voice permissions: View Channels, Read Message History, Send Messages, Send Messages in Threads, Create Public Threads, Create Private Threads, Add Reactions, Attach Files, Embed Links, Send Voice Messages, Send Polls, Connect, Speak, Video, and Use Voice Activity. Setup checks these permissions because Discord only allows the bot to set channel overwrites for permissions it holds. Private thread creation is denied on jam channels so maintainers can see all team discussions.

| Command | Behavior |
| --- | --- |
| `/joinjam` | Gives the participant role unless the user is blacklisted. |
| `/leavejam` | Removes jam participation and the participant role. |
| `/team create` | Opens a form for the team name, then creates private text and voice channels. |
| `/team add` | Opens a form to select a participant and optionally enter the team name. Grants access by user ID. |
| `/team info` | Shows the caller's team and its channels. |
| `/team disband` | Opens a form to choose a team, then archives its channels and releases its memberships. |
| `/jam kick` | Selects a user in a form and removes participation without blacklisting. |
| `/jam blacklist` | Selects a user in a form, removes their participant role, and blocks future joins. Administrators are protected. |
| `/jam unblacklist` | Selects a user in a form and allows future joins; it does not automatically rejoin them. |

Team owners manage their own team. Maintainers and administrators can manage another team by entering its name in the form, including force-disbanding it. Guards enforce setup, jam moderation, and team management permissions. The user selected in `/team add` must have both the participant and Verified roles and must not be blacklisted. A missing participation row alone does not reject a user with the participant role; an old database row does not replace a missing Discord role.

Team access uses individual member permission overwrites; the bot never creates a role per team. Maintainers can see every team channel. Team channel names contain only the normalized team name. Saved Discord channel IDs identify channels even when different team names produce the same slug. Disbanding moves both original channels into the configured archive category and preserves message history. Archives remain visible to maintainers. The team list contains only active team names, is visible to participants and maintainers, and permits only the bot to post. Discord administrators retain Discord's permission bypass.

Issue #22 remains deferred. Individual team departure, forced member removal, owner succession, and automatic disbanding are not implemented. `/leavejam`, `/jam kick`, `/jam blacklist`, and Verified removal currently update jam participation and the participant role only; they leave existing team memberships and channel overwrites unchanged.

Commands handle forms and responses, then delegate to services. `GameJamService` handles participation and moderation; `TeamService` handles teams; `JamAccessService` checks member eligibility; `JamChannelService` manages Discord channels. `JamRepository` uses Drizzle schema and query APIs. Errors propagate to the existing command runner.

`JamOperationService` only serializes operations within a server. There are no continuous sync scans, `needsSync` flags, or `/jam sync` command. Join and leave update the affected role; team actions update that team's channels, with list updates only when needed. Discord and the database cannot share a transaction. If a request fails, repeat the same action. Saved channel IDs and team creation/archive statuses let that action continue without deleting channels or duplicating memberships. `/jam-setup` is also available for explicit channel repair.

Run one bot instance. Tests use an in-memory database with the committed migrations and simulated Discord objects; they do not connect to a server or the configured Turso database. Migration `0002_remove_jam_sync_flags.sql` removes only the old sync flags. Apply the migration and restart the bot to deploy the new command forms, then run `/jam-setup` to update existing channel names and permissions.

## Dokploy deployment

Create an **Application** in Dokploy, select this repository and the production branch, and choose the Dockerfile build type with `./Dockerfile`. In the application's Environment settings, provide the required credentials, role IDs, channel names, and team capacity from `.env.example`. The image sets `NODE_ENV=production`. This bot does not serve HTTP, so it needs no domain or published port.

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
    jam/                Participation, teams, permissions, channels, moderation
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

Cooldown values are **milliseconds**, scoped by command name, interaction type, and user ID, and held in memory. Opening a form does not block its immediate submission. A process restart clears cooldowns. Guards run before a cooldown is acquired. Middleware wraps command execution. Known `BotError` messages can be shown to users; unexpected errors are logged and receive a generic response.

## Extend the bot

**Command:** Add a class extending `Command` in a feature module's `commands/` directory. Define a `SlashCommandBuilder` and `execute(context)`. Inject needed services in the constructor. Register the resolved command in the module's `index.ts` function. Optional `cooldown` values use milliseconds; optional `guards` contain injected guard instances.

**Modal:** Use discord.js builders with `context.showModal()` before deferring. Define allowed `modalActions` and an `executeModal(context)` handler. Modal custom IDs use `command:action`; submissions pass through the same guards, middleware, cooldowns, and error handler as commands.

**Module:** Create `src/modules/<feature>/` with its own commands, services, guards, events, and later repositories as needed. Export a `register<Feature>Module(container)` function. Call it explicitly from `src/app/bootstrap.ts`.

**Guard:** Implement `Guard.check(context)` and return `{ allowed: true }` or `{ allowed: false, message }`. Inject the guard into the command constructor and include it in the command's `guards` array. `GuardRunner` executes guards in declaration order.

**Service:** Put the service inside its feature module, mark it `@injectable()`, and inject it into commands or other services. If it later needs persistence, define a domain-specific repository interface and register its implementation behind a Symbol token in the composition root. `ModerationService` is a concrete example of keeping the Discord ban call out of `BanCommand`.

**Event:** Extend `Event<"eventName">`, implement `execute`, and register it in `EventRegistry` during bootstrap. `EventHandler` manages Discord listener attachment and removal.
