import type { DependencyContainer } from "tsyringe";
import { EventRegistry } from "../core/events/EventRegistry.ts";
import { LoggingMiddleware } from "../core/middleware/LoggingMiddleware.ts";
import { MiddlewareRunner } from "../core/middleware/MiddlewareRunner.ts";
import { registerModerationModule } from "../modules/moderation/index.ts";
import { registerUtilityModule } from "../modules/utility/index.ts";
import { ReadyEvent } from "./events/ReadyEvent.ts";
import { MessageEvent } from "./events/MessageEvent.ts";

export function registerModules(container: DependencyContainer): void {
  container.resolve(MiddlewareRunner).register(container.resolve(LoggingMiddleware));
  container.resolve(EventRegistry).register(container.resolve(ReadyEvent));
  // container.resolve(EventRegistry).register(container.resolve(MessageEvent));
  registerUtilityModule(container);
  registerModerationModule(container);
}
