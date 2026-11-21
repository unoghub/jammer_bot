import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { JoinTeamSubcommand } from "./JoinTeamSubcommand";
import { CreateTeamSubcommand } from "./CreateTeamSubcommand";
import { TeamKickSubcommand } from "./TeamKickSubcommand";
import { JoinRequestSubcommandGroup } from "./JoinRequestSubcommandGroup";
import { TeamLeaveSubcommand } from "./TeamLeaveSubcommand";

@injectable()
export class TeamCommand extends Command {
  readonly data = new SlashCommandBuilder().setName("team").setDescription("Manage your team");

  constructor(
    createTeamCommand: CreateTeamSubcommand,
    joinTeamCommand: JoinTeamSubcommand,
    joinRequestCommands: JoinRequestSubcommandGroup,
    teamKickCommand: TeamKickSubcommand,
    teamLeaveCommand: TeamLeaveSubcommand,
  ) {
    super();
    this.addSubcommand(joinTeamCommand);
    this.addSubcommand(createTeamCommand);
    this.addSubcommandGroup(joinRequestCommands);
    this.addSubcommand(teamKickCommand);
    this.addSubcommand(teamLeaveCommand);
  }

  async execute(): Promise<void> {}
}
