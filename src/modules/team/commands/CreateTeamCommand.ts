import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { TeamService } from "../services/TeamService";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";

@injectable()
export class CreateTeamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("create_team")
    .setDescription("Creates a new team with the specified name and members.")
    .addStringOption((option) =>
      option
        .setName("team_name")
        .setDescription("The name of the team to create.")
        .setRequired(true),
    );
  override readonly guards;

  constructor(
    private readonly team: TeamService,
    participantGuard: ParticipantGuard,
  ) {
    super();
    this.guards = [participantGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    const team_name = context.options.getString("team_name", true);
    await this.team.createTeam({
      name: team_name,
      owner: context.user,
      create_date: new Date(),
    });
    await context.editReply(`lorem ipsum or something: ${team_name}`);
  }
}
