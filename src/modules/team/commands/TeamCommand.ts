import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { JoinTeamCommand } from "./JoinTeamCommand";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { ParticipantGuard } from "../../jam/guards/ParticipantGuard";
import { CreateTeamCommand } from "./CreateTeamCommand";
import { JoinRequestCommands } from "./JoinRequestCommands";
import { TeamKickCommand } from "./TeamKickCommand";

@injectable()
export class TeamCommand extends Command {
  readonly data = new SlashCommandBuilder().setName("team").setDescription("Manage your team");
  override readonly guards;

  constructor(
    private readonly participantGuard: ParticipantGuard,
    private readonly createTeamCommand: CreateTeamCommand,
    private readonly joinTeamCommand: JoinTeamCommand,
    private readonly joinRequestCommands: JoinRequestCommands,
    private readonly teamKickCommand: TeamKickCommand,
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
