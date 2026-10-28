import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { JoinJamCommand } from "./commands/JoinJamCommand.ts";
import { LeaveJamCommand } from "./commands/LeaveJamCommand.ts";

export function registerJamModule(container: DependencyContainer): void {
  // TODO : move jam participancy to it's own service
  const commandRegistry = container.resolve(CommandRegistry);

  commandRegistry.register(container.resolve(JoinJamCommand));
  commandRegistry.register(container.resolve(LeaveJamCommand));
}
