import { inject, injectable } from "tsyringe";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
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
import { AutocompleteContext } from "./AutocompleteContext.ts";

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

  fetchCommand(context: CommandContext | AutocompleteContext): Command | Subcommand | undefined {
    let command: Command | Subcommand | undefined = this.registry.get(context.command);
    if (context.subcommandGroup) {
      const group = command?.getSubcommandGroup(context.subcommandGroup);
      command = group?.getSubcommand(context.subcommand ?? "");
    } else if (context.subcommand) {
      command = command?.getSubcommand(context.subcommand);
    }

    return command;
  }

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const context = new CommandContext(interaction);
      const command = this.fetchCommand(context);
      if (!command) {
        this.logger.warn("Unknown command", { command: interaction.commandName });
        throw new CommandError("This command is currently unavailable.", "UNKNOWN_COMMAND");
      }
      const result = await this.guards.run(command.guards ?? [], context);
      if (!result.allowed)
        throw new CommandError(result.message ?? "You cannot use this command.", "GUARD_DENIED");

      const remaining = this.cooldowns.acquire(
        context.name,
        context.user.id,
        command.cooldown ?? 0,
      );
      if (remaining > 0) {
        throw new CommandError(
          `Please wait ${Math.ceil(remaining / 1000)} second(s) before using this command again.`,
          "COOLDOWN",
        );
      }
      await this.middleware.run(context, () => command.execute(context));
    } catch (error) {
      await this.errors.handle(error, interaction);
    }
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    try {
      const start = Date.now();
      const context = new AutocompleteContext(interaction);
      const command = this.fetchCommand(context);
      if (!command) {
        throw new Error("This command is currently unavailable.");
      }
      if (!command.autocomplete) {
        throw new Error("This command does not support autocomplete.");
      }
      command.autocomplete(context);
      this.logger.info("Autocomplete handled", {
        command: context.command,
        ...(context.subcommandGroup && { subcommandGroup: context.subcommandGroup }),
        ...(context.subcommand && { subcommand: context.subcommand }),
        userId: context.user.id,
        durationMs: Date.now() - start,
      });
    } catch (error) {
      this.logger.error("Unknown command", { command: interaction.commandName });
    }
  }
}
