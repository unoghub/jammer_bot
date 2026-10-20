import type { DependencyContainer } from "tsyringe";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import { JamModerationCommand } from "./commands/JamModerationCommand.ts";
import { JamSetupCommand } from "./commands/JamSetupCommand.ts";
import { JoinGameJam } from "./commands/JoinGameJam.ts";
import { LeaveGameJam } from "./commands/LeaveGameJam.ts";
import { TeamCommand } from "./commands/TeamCommand.ts";
import { JamOperationService } from "./services/JamOperationService.ts";

export function registerJamModule(container: DependencyContainer): void {
  container.registerSingleton(JamOperationService);

  const commands = container.resolve(CommandRegistry);
  commands.register(container.resolve(JamSetupCommand));
  commands.register(container.resolve(JoinGameJam));
  commands.register(container.resolve(LeaveGameJam));
  commands.register(container.resolve(JamModerationCommand));
  commands.register(container.resolve(TeamCommand));
}
