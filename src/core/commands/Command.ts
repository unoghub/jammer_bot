import type { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { Guard } from "../guards/Guard.ts";
import type { CommandContext } from "./CommandContext.ts";
import type { CommandPolicy } from "./types.ts";

export abstract class Command implements CommandPolicy {
  abstract readonly data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
  abstract execute(context: CommandContext): Promise<void>;
}
