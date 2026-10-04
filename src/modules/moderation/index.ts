import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { BanCommand } from "./commands/BanCommand.ts";

export function registerModerationModule(container: DependencyContainer): void {
  container.resolve(CommandRegistry).register(container.resolve(BanCommand));
}
