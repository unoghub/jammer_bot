import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";
import { Subcommand } from "../../../core/commands/Subcommand";

@injectable()
export class LeaveJamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder().setName("leave").setDescription("Leave the game jam");

  constructor(private readonly participation: ParticipationService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const result = await this.participation.removeParticipant(context.interaction.user);
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
