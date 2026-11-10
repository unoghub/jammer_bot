import { injectable } from "tsyringe";
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { Subcommand } from "../../../core/commands/Subcommand";
import { SubcommandGroup } from "../../../core/commands/SubcommandGroup";

@injectable()
export class PrintLoremSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("lorem")
    .setDescription("lorem");

  async execute(context: CommandContext): Promise<void> {
    await context.reply("lorem");
  }
}

@injectable()
export class PrintIpsumSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("ipsum")
    .setDescription("ipsum");

  async execute(context: CommandContext): Promise<void> {
    await context.reply("ipsum");
  }
}

@injectable()
export class PrintLipsumSubcommandGroup extends SubcommandGroup {
  readonly data = new SlashCommandSubcommandGroupBuilder()
    .setName("lipsum")
    .setDescription("lipsum");

  constructor(
    private readonly loremSubcommand: PrintLoremSubcommand,
    private readonly ipsumSubcommand: PrintIpsumSubcommand,
  ) {
    super();
    this.addSubcommand(loremSubcommand);
    this.addSubcommand(ipsumSubcommand);
  }

  async execute(context: CommandContext): Promise<void> {
    await this.dispatch(context);
  }
}

@injectable()
export class PrintFooSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("foo")
    .setDescription("foo");

  async execute(context: CommandContext): Promise<void> {
    await context.reply("foo");
  }
}

@injectable()
export class PrintBarSubcommand extends Subcommand {
  readonly data = new SlashCommandSubcommandBuilder()
    .setName("bar")
    .setDescription("bar");

  async execute(context: CommandContext): Promise<void> {
    await context.reply("bar");
  }
}

@injectable()
export class PrintCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("print")
    .setDescription("print");

  constructor(
    private readonly barSubcommand: PrintBarSubcommand,
    private readonly fooSubcommand: PrintFooSubcommand,
    private readonly lipsumSubcommandGroup: PrintLipsumSubcommandGroup,
  ) {
    super();
    this.addSubcommand(barSubcommand);
    this.addSubcommand(fooSubcommand);
    this.addSubcommandGroup(lipsumSubcommandGroup);
  }

  async execute(context: CommandContext): Promise<void> {
    await this.dispatch(context);
  }
}
