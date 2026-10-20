import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { PingCommand } from "./commands/PingCommand.ts";

export function registerUtilityModule(container: DependencyContainer): void {
  container.resolve(CommandRegistry).register(container.resolve(PingCommand));
}
