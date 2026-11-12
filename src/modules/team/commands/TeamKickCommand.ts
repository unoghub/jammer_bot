import { injectable } from "tsyringe";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { TeamService } from "../services/TeamService";
import { MembershipRequestService } from "../services/MembershipRequestService";
import { TeamOwnerGuard } from "../guards/teamOwnerGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { Subcommand } from "../../../core/commands/Subcommand";

@injectable()
export class TeamKickCommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from your team")
    .addUserOption((option) => option.setName("member").setDescription("The member to kick").setRequired(true));
  override readonly guards;

  constructor(
    private readonly team: TeamService,
    teamOwnerGuard: TeamOwnerGuard,
  ) {
    super();
    this.guards = [teamOwnerGuard];
  }

  override async execute(context: CommandContext): Promise<void> {
    const targetMember = context.interaction.options.getUser("member", true);
    const ownerMembership = await this.team.fetchMembershipFromUser(context.interaction.user.id);
    if (ownerMembership === null) {
      await context.editReply("You are not a member of any team.");
      return;
    }
    const userMembership = await this.team.fetchMembershipFromUser(targetMember.id);
    if (userMembership?.teamId !== ownerMembership.teamId) {
      await context.editReply(`${targetMember.username} is not a member of your team.`);
      return;
    }
    this.team.removeTeamMember(targetMember.id);
    context.editReply(`${targetMember.username} has been kicked from the team.`);
  }
}
