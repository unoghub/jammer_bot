import type { SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { CommandPolicy } from "./types";
import type { Guard } from "../guards/Guard";
import type { CommandContext } from "./CommandContext";
import type { Subcommand } from "./Subcommand";
import { SubcommandRegistry } from "./SubcommandRegistry";
import { CommandError } from "../errors/CommandError";
import { CommandHandler } from "./CommandHandler";

export abstract class SubcommandGroup {
  abstract readonly data: SlashCommandSubcommandGroupBuilder;
  readonly subcommands = new SubcommandRegistry();
  addSubcommand(subcommand: Subcommand) {
    this.data.addSubcommand(subcommand.data);
    this.subcommands.register(subcommand);
  }
  getSubcommand(name: string) {
    return this.subcommands.get(name);
  }
}
