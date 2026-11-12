import { injectable } from "tsyringe";
import { SubcommandGroup } from "../../../core/commands/SubcommandGroup";
import { SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, User } from "discord.js";
import { CommandContext } from "../../../core/commands/CommandContext";
import { TeamOwnerGuard } from "../guards/teamOwnerGuard";
import { Subcommand } from "../../../core/commands/Subcommand";
import { type TeamMembershipState, TeamService } from "../services/TeamService";
import { MembershipRequestService } from "../services/MembershipRequestService";

type TeamRequestContext = CommandContext & { targetUser: User; membership: TeamMembershipState };

@injectable()
export class JoinRequestAcceptSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("accept")
    .setDescription("Accept a join request")
    .addUserOption((option) => option.setName("user").setDescription("The user to accept").setRequired(true));

  constructor(private readonly membershipRequest: MembershipRequestService) {
    super();
  }

  async execute(context: TeamRequestContext): Promise<void> {
    const result = await this.membershipRequest.accept(context.targetUser.id, context.membership.teamId);
    switch (result.status) {
      case "not_found":
        await context.editReply("The user has not requested to join your team.");
        return;
      case "accepted":
        await context.editReply("User has been accepted into the team.");
        return;
      case "expired":
        await context.editReply("The user's request to join your team has expired.");
        return;
    }
  }
}

@injectable()
export class JoinRequestDenySubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("deny")
    .setDescription("Deny a join request")
    .addUserOption((option) => option.setName("user").setDescription("The user to deny").setRequired(true));

  constructor(private readonly membershipRequest: MembershipRequestService) {
    super();
  }

  async execute(context: TeamRequestContext): Promise<void> {
    const result = await this.membershipRequest.deny(context.targetUser.id, context.membership.teamId);
    switch (result.status) {
      case "not_found":
        await context.editReply("The user has not requested to join your team.");
        return;
      case "denied":
        await context.editReply("User has been denied into the team.");
        return;
      case "expired":
        await context.editReply("The user's request to join your team has expired.");
        return;
    }
  }
}

@injectable()
export class JoinRequestSubcommandGroup extends SubcommandGroup {
  readonly data = new SlashCommandSubcommandGroupBuilder().setName("request").setDescription("request");
  override readonly guards;

  constructor(
    private readonly requestDenyCommand: JoinRequestDenySubcommand,
    private readonly requestAcceptCommand: JoinRequestAcceptSubcommand,
    private readonly teamOwnerGuard: TeamOwnerGuard,
    private readonly team: TeamService,
  ) {
    super();
    this.addSubcommand(requestDenyCommand);
    this.addSubcommand(requestAcceptCommand);
    this.guards = [teamOwnerGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const target_user = context.interaction.options.getUser("user", true);
    console.log(target_user.username);
    const membershipState = await this.team.fetchMembershipFromUser(context.user.id);

    if (membershipState === null) {
      await context.editReply("You are not a member of any team.");
      return;
    }

    const requestContext: TeamRequestContext = Object.assign(context, { targetUser: target_user, membership: membershipState });
    await this.dispatch(context);
  }
}
