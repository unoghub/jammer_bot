import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { JoinGamejamCommand } from "./commands/JoinGamejam.ts";

export function registerTeamModule(container: DependencyContainer): void {
  container
    .resolve(CommandRegistry)
    .register(container.resolve(JoinGamejamCommand));
}
