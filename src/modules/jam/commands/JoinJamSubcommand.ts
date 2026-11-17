import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { ParticipationService } from "../services/ParticipationService";
import { Subcommand } from "../../../core/commands/Subcommand";
import { CommandError } from "../../../core/errors/CommandError";

@injectable()
export class JoinJamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder().setName("join").setDescription("Join a game jam");

  constructor(private readonly participation: ParticipationService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const user = context.interaction.user;
    switch (
      await this.participation.createParticipant(user.id, {
        name: user.username,
        join_date: context.interaction.createdAt,
      })
    ) {
      case "success":
        await context.editReply({
          content: "You have successfully joined the jam!",
        });
        return;
      case "already_registered":
        await context.editReply({
          content: "You are already registered for the jam!",
        });
        return;
      default:
        throw new CommandError("Unexpected result from createParticipant");
    }
  }
}
