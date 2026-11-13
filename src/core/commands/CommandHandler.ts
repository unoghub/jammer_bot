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
import type { Command } from "./Command.ts";
import type { Subcommand } from "./Subcommand.ts";
import type { SubcommandGroup } from "./SubcommandGroup.ts";

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
      const context = new CommandContext(interaction);
      context.subcommandGroup = interaction.options.getSubcommandGroup(false) ?? undefined;
      context.subcommand = interaction.options.getSubcommand(false) ?? undefined;

      let command: Command | Subcommand | undefined = this.registry.get(interaction.commandName);
      if (context.subcommandGroup) {
        const group = command?.getSubcommandGroup(context.subcommandGroup);
        command = group?.getSubcommand(context.subcommand ?? "");
      } else if (context.subcommand) {
        command = command?.getSubcommand(context.subcommand);
      }
      if (!command) {
        this.logger.warn("Unknown command", { command: interaction.commandName });
        throw new CommandError("This command is currently unavailable.", "UNKNOWN_COMMAND");
      }
      const result = await this.guards.run(command.guards ?? [], context);
      if (!result.allowed) throw new CommandError(result.message ?? "You cannot use this command.", "GUARD_DENIED");

      const remaining = this.cooldowns.acquire(context.name, context.user.id, command.cooldown ?? 0);
      if (remaining > 0) {
        throw new CommandError(`Please wait ${Math.ceil(remaining / 1000)} second(s) before using this command again.`, "COOLDOWN");
      }
      await this.middleware.run(context, () => command.execute(context));
    } catch (error) {
      await this.errors.handle(error, interaction);
    }
  }
}
