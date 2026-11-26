import { SlashCommandSubcommandBuilder } from "discord.js";
import type { CommandPolicy } from "./types";
import type { CommandContext } from "./CommandContext";
import type { AnyGuard } from "../guards/Guard";
import type { AutocompleteContext } from "./AutocompleteContext";

export abstract class Subcommand implements CommandPolicy {
  abstract readonly data: SlashCommandSubcommandBuilder;
  readonly guards?: readonly AnyGuard[];
  readonly cooldown?: number;
  abstract execute(context: CommandContext): Promise<void>;
  autocomplete?(context: AutocompleteContext): Promise<void>;
}
