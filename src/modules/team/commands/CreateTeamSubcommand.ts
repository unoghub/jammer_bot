import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { injectable } from "tsyringe";
import { TeamService } from "../services/TeamService";
import { Subcommand } from "../../../core/commands/Subcommand";

@injectable()
export class CreateTeamSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("create")
    .setDescription("Creates a new team with the specified name and members.")
    .addStringOption((option) => option.setName("team_name").setDescription("The name of the team to create.").setRequired(true));

  constructor(private readonly team: TeamService) {
    super();
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
