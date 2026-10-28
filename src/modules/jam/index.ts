import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { JoinJamCommand } from "./commands/JoinJamCommand.ts";

export function registerJamModule(container: DependencyContainer): void {
  const commandRegistry = container.resolve(CommandRegistry);

  commandRegistry.register(container.resolve(JoinJamCommand));
}
