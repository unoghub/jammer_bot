import { SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { Guard } from "../guards/Guard.ts";
import type { CommandContext } from "./CommandContext.ts";
import type { CommandPolicy } from "./types.ts";
import { SubcommandRegistry } from "./SubcommandRegistry.ts";
import { SubcommandGroupRegistry } from "./SubcommandGroupRegistry.ts";
import type { Subcommand } from "./Subcommand.ts";
import type { SubcommandGroup } from "./SubcommandGroup.ts";
import { CommandError } from "../errors/CommandError.ts";
import { CommandHandler } from "./CommandHandler.ts";
import { injectable } from "tsyringe";

export abstract class Command implements CommandPolicy {
  abstract readonly data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
  private readonly subcommands = new SubcommandRegistry();
  private readonly subcommandGroups = new SubcommandGroupRegistry();
  addSubcommand(subcommand: Subcommand) {
    if (!(this.data instanceof SlashCommandBuilder)) {
      throw new CommandError("Subcommands are not supported for this command", "SUBCOMMAND_DENIED");
    }
    this.data.addSubcommand(subcommand.data);
    this.subcommands.register(subcommand);
  }
  addSubcommandGroup(subcommandGroup: SubcommandGroup) {
    if (!(this.data instanceof SlashCommandBuilder)) {
      throw new CommandError("Subcommand groups are not supported for this command", "SUBCOMMAND_GROUP_DENIED");
    }
    this.data.addSubcommandGroup(subcommandGroup.data);
    this.subcommandGroups.register(subcommandGroup);
  }
  async dispatch(context: CommandContext): Promise<void> {
    const subcommandGroup = context.options.getSubcommandGroup(false);
    if (subcommandGroup) {
      const group = this.subcommandGroups.get(subcommandGroup);
      if (!group) throw new CommandError("Subcommand group not found", "SUBCOMMAND_GROUP_NOT_FOUND");
      context.subcommandGroup = subcommandGroup;
      await context.handler.run(context, group);
      return;
    }
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
