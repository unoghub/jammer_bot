import { injectable } from "tsyringe";
import { Subcommand } from "../../../core/commands/Subcommand";
import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { TeamService } from "../services/TeamService";

@injectable()
export class TeamLeaveSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("leave")
    .setDescription("Leave your current team");

  constructor(private readonly team: TeamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const result = await this.team.removeTeamMember(context.interaction.user.id);
    switch (result) {
      case "success":
        await context.editReply("You have left the team successfully.");
        break;
      case "not_member":
        await context.editReply("You are not a member of any team.");
        break;
    }
  }
}
