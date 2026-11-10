import { injectable } from "tsyringe";
import { Command } from "../../../../core/commands/Command";
import { SlashCommandBuilder } from "discord.js";
import type { CommandContext } from "../../../../core/commands/CommandContext";
import { PrintBarSubcommand } from "./BarSubcommand";
import { PrintFooSubcommand } from "./FooSubcommand";

@injectable()
export class PrintCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("print")
    .setDescription("print");

  constructor(
    private readonly barSubcommand: PrintBarSubcommand,
    private readonly fooSubcommand: PrintFooSubcommand,
  ) {
    super();
    this.addSubcommand(barSubcommand);
    this.addSubcommand(fooSubcommand);
  }

  async execute(context: CommandContext): Promise<void> {
    await this.dispatch(context);
  }
}
