import { injectable } from "tsyringe";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { MembershipRequestService } from "../services/MembershipRequestService";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { Subcommand } from "../../../core/commands/Subcommand";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import type { AutocompleteContext } from "../../../core/commands/AutocompleteContext";
import { TeamService } from "../services/TeamService";

@injectable()
export class JoinTeamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("join")
    .setDescription("Request to join a team")
    .addStringOption((option) =>
      option
        .setName("team_name")
        .setDescription("The team you want to join")
        .setRequired(true)
        .setAutocomplete(true),
    );
  override readonly guards;

  constructor(
    private readonly membershipRequest: MembershipRequestService,
    private readonly team: TeamService,
    participantGuard: ParticipantGuard,
  ) {
    super();
    this.guards = [participantGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const team = context.interaction.options.getString("team", true);
    await this.membershipRequest.request(context.interaction.user.id, team);
    await context.editReply(
      `Your request to join the team **${team}** has been sent. The team owner will be notified.`,
    );
    // TODO : send message to team owner
  }

  override async autocomplete(context: AutocompleteContext): Promise<void> {
    const focusedValue = context.options.getFocused();
    const choices = await this.team.getTeams();
    const filtered = choices.filter((choice) => choice.startsWith(focusedValue));
    await context.respond(filtered.map((choice) => ({ name: choice, value: choice })));
  }
}
