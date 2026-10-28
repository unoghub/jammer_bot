import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";

@injectable()
export class JoinJamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("join-jam")
    .setDescription("Join a game jam");

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
