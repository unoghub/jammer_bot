import { injectable } from "tsyringe";
import { Subcommand } from "../../../../core/commands/Subcommand";
import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandContext } from "../../../../core/commands/CommandContext";

@injectable()
export class PrintFooSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("foo")
    .setDescription("foo");

  async execute(context: CommandContext): Promise<void> {
    await context.reply("foo");
  }
}
