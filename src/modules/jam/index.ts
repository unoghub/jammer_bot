import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { JamCommand } from "./commands/JamCommand.ts";

export function registerJamModule(container: DependencyContainer): void {
  // TODO : move jam participancy to it's own service
  const commandRegistry = container.resolve(CommandRegistry);
  commandRegistry.register(container.resolve(JamCommand));
}
