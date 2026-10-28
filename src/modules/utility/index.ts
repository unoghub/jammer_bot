import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { PingCommand } from "./commands/PingCommand.ts";
import { SetVerifiedRoleCommand } from "./commands/SetVerifiedRoleCommand.ts";

export function registerUtilityModule(container: DependencyContainer): void {
  container.resolve(CommandRegistry).register(container.resolve(PingCommand));
  container
    .resolve(CommandRegistry)
    .register(container.resolve(SetVerifiedRoleCommand));
}
