import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import { injectable } from "tsyringe";
import type { CommandContext } from "../../../core/commands/CommandContext";
import type { DiscordClient } from "../../../infrastructure/discord/DiscordClient";

@injectable()
export class PingCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("gamejam_join")
    .setDescription("Join Gamejam");
  override readonly cooldown = 3_000;

  constructor(private readonly discord: DiscordClient) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    await context.reply({
      content: `join the gamejam or something`,
      flags: [MessageFlags.Ephemeral],
    });
  }
}
