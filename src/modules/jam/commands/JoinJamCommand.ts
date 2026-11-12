import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";
import { Subcommand } from "../../../core/commands/Subcommand";

@injectable()
export class JoinJamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder().setName("join").setDescription("Join a game jam");

  constructor(private readonly participation: ParticipationService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    await this.participation.createParticipant(context.interaction.user, {
      join_date: context.interaction.createdAt,
    });
    await context.editReply({
      content: "You have successfully joined the jam!",
    });
  }
}
