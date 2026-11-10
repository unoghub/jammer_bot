import {
  SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { CommandPolicy } from "./types";
import type { CommandContext } from "./CommandContext";
import type { Guard } from "../guards/Guard";

export abstract class Subcommand implements CommandPolicy {
  abstract readonly data: SlashCommandSubcommandBuilder;
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
  abstract execute(context: CommandContext): Promise<void>;
}
