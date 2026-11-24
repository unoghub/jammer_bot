import { injectable } from "tsyringe";
import { Subcommand } from "../../../core/commands/Subcommand";
import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { TeamOwnerGuard } from "../guards/teamOwnerGuard";
import { TeamService } from "../services/TeamService";

@injectable()
export class TeamTransferOwnerSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("transfer_owner")
    .setDescription("Transfer ownership of your team to another member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to transfer ownership to")
        .setRequired(true),
    );
  override readonly guards;
  constructor(
    teamOwnerGuard: TeamOwnerGuard,
    private readonly team: TeamService,
  ) {
    super();
    this.guards = [teamOwnerGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    const targetMember = context.interaction.options.getUser("member", true);
    const ownerMembership = await this.team.fetchMembershipFromUser(context.user.id);
    // might put a required clause for fetchMembership
    if (ownerMembership === null) {
      await context.editReply("You are not a member of any team.");
      return;
    }
    if (targetMember.id == context.user.id) {
      await context.editReply("You cannot transfer to yourself, you're already an owner!");
      return;
    }
    const userMembership = await this.team.fetchMembershipFromUser(targetMember.id);
    if (userMembership?.teamId !== ownerMembership.teamId) {
      await context.editReply(`${targetMember.username} is not a member of your team.`);
      return;
    }
    this.team.setOwner(ownerMembership.teamId, targetMember.id);
  }
}
