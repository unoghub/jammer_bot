import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { CreateTeamCommand } from "./commands/CreateTeamCommand.ts";
import { JoinTeamCommand } from "./commands/JoinTeamCommand.ts";

export function registerTeamModule(container: DependencyContainer): void {
  const commandRegistry = container.resolve(CommandRegistry);
  commandRegistry.register(container.resolve(CreateTeamCommand));
  commandRegistry.register(container.resolve(JoinTeamCommand));
}
