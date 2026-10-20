import { injectable } from "tsyringe";
import type { Interaction } from "discord.js";
import { CommandHandler } from "../../core/commands/CommandHandler.ts";

@injectable()
export class InteractionRouter {
  constructor(private readonly commands: CommandHandler) {}

  async route(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) await this.commands.handle(interaction);
  }
}
