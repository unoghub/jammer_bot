import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { MembershipRequestService } from "../services/MembershipRequestService";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";

@injectable()
export class JoinTeamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("join-team")
    .setDescription("Request to join a team")
    .addStringOption((option) =>
      option
        .setName("team")
        .setDescription("The team you want to join")
        .setRequired(true),
    );
  override readonly guards;

  constructor(
    private readonly membershipRequest: MembershipRequestService,
    participantGuard: ParticipantGuard,
  ) {
    super();
    this.guards = [participantGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const team = context.interaction.options.getString("team", true);
    await this.membershipRequest.request(context.interaction.user, team);
    await context.editReply(
      `Your request to join the team **${team}** has been sent. The team owner will be notified.`,
    );
  }
}
