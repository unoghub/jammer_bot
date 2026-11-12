import { injectable } from "tsyringe";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { MembershipRequestService } from "../services/MembershipRequestService";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { Subcommand } from "../../../core/commands/Subcommand";

@injectable()
export class JoinTeamCommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("join")
    .setDescription("Request to join a team")
    .addStringOption((option) => option.setName("team").setDescription("The team you want to join").setRequired(true));

  constructor(private readonly membershipRequest: MembershipRequestService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const team = context.interaction.options.getString("team", true);
    await this.membershipRequest.request(context.interaction.user, team);
    await context.editReply(`Your request to join the team **${team}** has been sent. The team owner will be notified.`);
  }
}
