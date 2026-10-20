import type { DependencyContainer } from "tsyringe";
import { EventRegistry } from "../core/events/EventRegistry.ts";
import { LoggingMiddleware } from "../core/middleware/LoggingMiddleware.ts";
import { MiddlewareRunner } from "../core/middleware/MiddlewareRunner.ts";
import { registerModerationModule } from "../modules/moderation/index.ts";
import { registerUtilityModule } from "../modules/utility/index.ts";
import { registerJamModule } from "../modules/jam/index.ts";
import { ReadyEvent } from "./events/ReadyEvent.ts";

export function registerModules(container: DependencyContainer): void {
  container.resolve(MiddlewareRunner).register(container.resolve(LoggingMiddleware));
  container.resolve(EventRegistry).register(container.resolve(ReadyEvent));
  registerUtilityModule(container);
  registerModerationModule(container);
  registerJamModule(container);
}
