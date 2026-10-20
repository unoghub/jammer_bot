import "reflect-metadata";
import { container, Lifecycle, type DependencyContainer } from "tsyringe";
import { loadConfig } from "../config/Config.ts";
import { TOKENS } from "../config/tokens.ts";
import { CommandRegistry } from "../core/commands/CommandRegistry.ts";
import { CooldownManager } from "../core/cooldowns/CooldownManager.ts";
import { EventRegistry } from "../core/events/EventRegistry.ts";
import { MiddlewareRunner } from "../core/middleware/MiddlewareRunner.ts";
import { DiscordClient } from "../infrastructure/discord/DiscordClient.ts";
import { DatabaseService } from "../infrastructure/database/DatabaseService.ts";
import type { Logger } from "../infrastructure/logger/Logger.ts";
import { PinoLogger } from "../infrastructure/logger/PinoLogger.ts";

export function setupContainer(): DependencyContainer {
  const app = container.createChildContainer();
  app.register(TOKENS.Config, { useValue: loadConfig() });
  app.register<Logger>(TOKENS.Logger, { useClass: PinoLogger }, { lifecycle: Lifecycle.Singleton });
  app.registerSingleton(DiscordClient);
  app.registerSingleton(DatabaseService);
  app.registerSingleton(CommandRegistry);
  app.registerSingleton(EventRegistry);
  app.registerSingleton(MiddlewareRunner);
  app.registerSingleton(CooldownManager);
  return app;
}
