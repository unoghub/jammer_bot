import { inject, injectable } from "tsyringe";
import type { ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import { TOKENS } from "../../config/tokens.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";
import { CooldownManager } from "../cooldowns/CooldownManager.ts";
import { CommandError } from "../errors/CommandError.ts";
import { ErrorHandler } from "../errors/ErrorHandler.ts";
import { GuardRunner } from "../guards/GuardRunner.ts";
import { MiddlewareRunner } from "../middleware/MiddlewareRunner.ts";
import { CommandContext } from "./CommandContext.ts";
import { CommandRegistry } from "./CommandRegistry.ts";
import { VerifiedMemberGuard } from "../guards/VerifiedMemberGuard.ts";

@injectable()
export class CommandHandler {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly guards: GuardRunner,
    private readonly cooldowns: CooldownManager,
    private readonly middleware: MiddlewareRunner,
    private readonly errors: ErrorHandler,
    private readonly verified: VerifiedMemberGuard,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async handle(interaction: ChatInputCommandInteraction | ModalSubmitInteraction): Promise<void> {
    try {
      const context = new CommandContext(interaction);
      const command = this.registry.get(context.commandName);
      if (!command) {
        this.logger.warn("Unknown command", { command: context.commandName });
        throw new CommandError("This command is currently unavailable.", "UNKNOWN_COMMAND");
      }
      if (interaction.isModalSubmit()) {
        const validAction = command.modalActions.includes(context.action);
        const validId = interaction.customId === `${context.commandName}:${context.action}`;
        if (!validAction || !validId) throw new CommandError("Bu form desteklenmiyor.", "UNKNOWN_MODAL");
      }
      const result = await this.guards.run([this.verified, ...(command.guards ?? [])], context);
      if (!result.allowed) throw new CommandError(result.message ?? "You cannot use this command.", "GUARD_DENIED");

      const cooldownKey = `${command.data.name}:${context.isModalSubmit ? "submit" : "open"}`;
      const remaining = this.cooldowns.acquire(cooldownKey, context.user.id, command.cooldown ?? 0);
      if (remaining > 0) {
        throw new CommandError(`Please wait ${Math.ceil(remaining / 1000)} second(s) before using this command again.`, "COOLDOWN");
      }
      await this.middleware.run(context, () => context.isModalSubmit ? command.executeModal(context) : command.execute(context));
    } catch (error) {
      await this.errors.handle(error, interaction);
    }
  }
}
