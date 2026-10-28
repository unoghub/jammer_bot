import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";

@injectable()
export class LeaveJamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("leave-jam")
    .setDescription("Leave the game jam");

  constructor(private readonly participation: ParticipationService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const result = await this.participation.removeParticipant(
      context.interaction.user,
    );
    if (result) {
      await context.editReply({
        content: "You have successfully left the jam!",
      });
    } else {
      await context.editReply({
        content: "You are not registered as a participant.",
      });
    }
  }
}
