import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";
import { Subcommand } from "../../../core/commands/Subcommand";
import { CommandError } from "../../../core/errors/CommandError";

@injectable()
export class LeaveJamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder().setName("leave").setDescription("Leave the game jam");

  constructor(private readonly participation: ParticipationService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const result = await this.participation.removeParticipant(context.interaction.user);
    // TODO: add confirmation prompt here
    switch (result) {
      case "success":
        await context.editReply({
          content: "You have successfully left the jam!",
        });
        return;
      case "not_registered":
        await context.editReply({
          content: "You are not registered for the jam!",
        });
        return;
      default:
        throw new CommandError("Unexpected result from removeParticipant");
    }
  }
}
