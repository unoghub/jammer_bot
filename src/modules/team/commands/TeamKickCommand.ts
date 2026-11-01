import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import type { TeamService } from "../services/TeamService";
import type { MembershipRequestService } from "../services/MembershipRequestService";
import type { TeamOwnerGuard } from "../guards/teamOwnerGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";

@injectable()
export class TeamKickCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("team_kick")
    .setDescription("Kick a member from your team")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to kick")
        .setRequired(true),
    );
  override readonly guards;

  constructor(
    private readonly team: TeamService,
    private readonly membershipRequest: MembershipRequestService,
    teamOwnerGuard: TeamOwnerGuard,
  ) {
    super();
    this.guards = [teamOwnerGuard];
  }

  override async execute(context: CommandContext): Promise<void> {
    const member = context.interaction.options.getUser("member", true);
    const ownerMembership = await this.team.fetchMembershipFromUser(
      context.interaction.user.id,
    );
    if (ownerMembership === null) {
      await context.editReply("You are not a member of any team.");
      return;
    }
    const userMembership = await this.team.fetchMembershipFromUser(member.id);
    if (userMembership?.teamId !== ownerMembership.teamId) {
      await context.editReply(
        `${member.username} is not a member of your team.`,
      );
      return;
    }
    this.team.removeTeamMember(member.id);
  }
}
