import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import { JoinJamSubcommand } from "./JoinJamCommand";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { LeaveJamSubcommand } from "./LeaveJamCommand";

@injectable()
export class JamCommand extends Command {
  readonly data = new SlashCommandBuilder().setName("jam").setDescription("jam");

  constructor(joinJamSubcommand: JoinJamSubcommand, leaveJamSubcommand: LeaveJamSubcommand) {
    super();
    this.addSubcommand(joinJamSubcommand);
    this.addSubcommand(leaveJamSubcommand);
  }

  async execute(context: CommandContext): Promise<void> {
    await this.dispatch(context);
  }
}
