import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { PingCommand } from "./commands/PingCommand.ts";
import { PrintCommand } from "./commands/print/index.ts";

export function registerUtilityModule(container: DependencyContainer): void {
  const commandRegistry = container.resolve(CommandRegistry);
  commandRegistry.register(container.resolve(PingCommand));
  commandRegistry.register(container.resolve(PrintCommand));
}
