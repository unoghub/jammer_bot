import type { SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { Subcommand } from "./Subcommand";
import { SubcommandRegistry } from "./SubcommandRegistry";

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
