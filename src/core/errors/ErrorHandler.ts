import { inject, injectable } from "tsyringe";
import type { ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import { TOKENS } from "../../config/tokens.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";
import { BotError } from "./BotError.ts";

@injectable()
export class ErrorHandler {
  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) {}

  async handle(error: unknown, interaction: ChatInputCommandInteraction | ModalSubmitInteraction): Promise<void> {
    const commandName = interaction.isModalSubmit() ? interaction.customId : interaction.commandName;
    const known = error instanceof BotError;
    const message = known ? error.publicMessage : "Something went wrong. Please try again later.";
    if (known) {
      this.logger.warn("Command rejected", { code: error.code, command: commandName });
    } else {
      this.logger.error("Unexpected command error", { err: error, command: commandName });
    }

    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: message });
      } else if (interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    } catch (responseError) {
      this.logger.error("Failed to send command error response", { err: responseError });
    }
  }
}
