import { inject, injectable } from "tsyringe";
import type { ChatInputCommandInteraction } from "discord.js";
import { TOKENS } from "../../config/tokens.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";
import { CooldownManager } from "../cooldowns/CooldownManager.ts";
import { CommandError } from "../errors/CommandError.ts";
import { ErrorHandler } from "../errors/ErrorHandler.ts";
import { GuardRunner } from "../guards/GuardRunner.ts";
import { MiddlewareRunner } from "../middleware/MiddlewareRunner.ts";
import { CommandContext } from "./CommandContext.ts";
import { CommandRegistry } from "./CommandRegistry.ts";

@injectable()
export class CommandHandler {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly guards: GuardRunner,
    private readonly cooldowns: CooldownManager,
    private readonly middleware: MiddlewareRunner,
    private readonly errors: ErrorHandler,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const command = this.registry.get(interaction.commandName);
      if (!command) {
        this.logger.warn("Unknown command", { command: interaction.commandName });
        throw new CommandError("This command is currently unavailable.", "UNKNOWN_COMMAND");
      }
      const context = new CommandContext(interaction);
      const result = await this.guards.run(command.guards ?? [], context);
      if (!result.allowed) throw new CommandError(result.message ?? "You cannot use this command.", "GUARD_DENIED");

      const remaining = this.cooldowns.acquire(command.data.name, context.user.id, command.cooldown ?? 0);
      if (remaining > 0) {
        throw new CommandError(`Please wait ${Math.ceil(remaining / 1000)} second(s) before using this command again.`, "COOLDOWN");
      }
      await this.middleware.run(context, () => command.execute(context));
    } catch (error) {
      await this.errors.handle(error, interaction);
    }
  }
}
