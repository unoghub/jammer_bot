import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import type { DatabaseService } from "../../../infrastructure/database/DatabaseService";

export class JoinGameJamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("join-gamejam")
    .setDescription("Join a game jam");

  constructor(private readonly db: DatabaseService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.reply({
      content: "This command is not yet implemented.",
      flags: [MessageFlags.Ephemeral],
    });
  }
}
