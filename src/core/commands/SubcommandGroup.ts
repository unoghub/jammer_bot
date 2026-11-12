import type { SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { CommandPolicy } from "./types";
import type { Guard } from "../guards/Guard";
import type { CommandContext } from "./CommandContext";
import type { Subcommand } from "./Subcommand";
import { SubcommandRegistry } from "./SubcommandRegistry";
import { CommandError } from "../errors/CommandError";
import { CommandHandler } from "./CommandHandler";

export abstract class SubcommandGroup implements CommandPolicy {
  abstract readonly data: SlashCommandSubcommandGroupBuilder;
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
  readonly subcommands = new SubcommandRegistry();
  addSubcommand(subcommand: Subcommand) {
    this.data.addSubcommand(subcommand.data);
    this.subcommands.register(subcommand);
  }
  async dispatch(context: CommandContext): Promise<void> {
    const subcommand = context.options.getSubcommand(false);
    if (subcommand) {
      const cmd = this.subcommands.get(subcommand);
      if (!cmd) throw new CommandError("Subcommand not found", "SUBCOMMAND_NOT_FOUND");
      context.subcommand = subcommand;
      await context.handler.run(context, cmd);
      return;
    }
  }
  abstract execute(context: CommandContext): Promise<void>;
}
