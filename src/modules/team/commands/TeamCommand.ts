import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { JoinTeamSubcommand } from "./JoinTeamSubcommand";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import { CreateTeamSubcommand } from "./CreateTeamSubcommand";
import { TeamKickSubcommand } from "./TeamKickSubcommand";
import type { JoinRequestSubcommandGroup } from "./JoinRequestSubcommandGroup";

@injectable()
export class TeamCommand extends Command {
  readonly data = new SlashCommandBuilder().setName("team").setDescription("Manage your team");
  override readonly guards;

  constructor(
    participantGuard: ParticipantGuard,
    createTeamCommand: CreateTeamSubcommand,
    joinTeamCommand: JoinTeamSubcommand,
    joinRequestCommands: JoinRequestSubcommandGroup,
    teamKickCommand: TeamKickSubcommand,
  ) {
    super();
    this.addSubcommand(joinTeamCommand);
    this.addSubcommand(createTeamCommand);
    this.addSubcommandGroup(joinRequestCommands);
    this.addSubcommand(teamKickCommand);
    this.guards = [participantGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await this.dispatch(context);
  }
}
