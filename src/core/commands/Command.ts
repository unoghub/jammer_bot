import type { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { Guard } from "../guards/Guard.ts";
import type { CommandContext } from "./CommandContext.ts";
import { CommandError } from "../errors/CommandError.ts";

export abstract class Command {
  abstract readonly data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
  readonly modalActions: readonly string[] = [];
  abstract execute(context: CommandContext): Promise<void>;

  async executeModal(context: CommandContext): Promise<void> {
    throw new CommandError("Bu form desteklenmiyor.", "UNKNOWN_MODAL");
  }
}
