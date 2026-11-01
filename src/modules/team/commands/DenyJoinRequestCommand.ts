import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { MembershipRequestService } from "../services/MembershipRequestService";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { TeamOwnerGuard } from "../guards/teamOwnerGuard";
import { TeamService } from "../services/TeamService";

@injectable()
export class DenyJoinRequestCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("deny_join_request")
    .setDescription("Deny a user's request to join your team")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to deny")
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

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const accepted_user = context.interaction.options.getUser("user", true);
    const membershipState = await this.team.fetchMembershipFromUser(
      context.user.id,
    );
    if (membershipState === null) {
      // NOTE : the thread should never hit this case unless there is some race condition bs happening
      await context.editReply("You are not a member of any team.");
      return;
    }
    const result = await this.membershipRequest.deny(
      accepted_user.id,
      membershipState.teamId,
    );
    switch (result.status) {
      case "not_found":
        await context.editReply(
          "The user has not requested to join your team.",
        );
        return;
      case "denied":
        await context.editReply("User has been denied into the team.");
        return;
      case "expired":
        await context.editReply(
          "The user's request to join your team has expired.",
        );
        return;
    }
  }
}
