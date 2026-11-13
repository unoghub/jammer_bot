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
  getSubcommand(name: string) {
    return this.subcommands.get(name);
  }
  addSubcommandGroup(subcommandGroup: SubcommandGroup) {
    if (!(this.data instanceof SlashCommandBuilder)) {
      throw new CommandError("Subcommand groups are not supported for this command", "SUBCOMMAND_GROUP_DENIED");
    }
    this.data.addSubcommandGroup(subcommandGroup.data);
    this.subcommandGroups.register(subcommandGroup);
  }
  getSubcommandGroup(name: string) {
    return this.subcommandGroups.get(name);
  }
  abstract execute(context: CommandContext): Promise<void>;
}
