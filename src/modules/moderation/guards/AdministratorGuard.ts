import { PermissionFlagsBits } from "discord.js";
import { injectable } from "tsyringe";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import type { Guard } from "../../../core/guards/Guard.ts";
import type { GuardResult } from "../../../core/guards/GuardResult.ts";

@injectable()
export class AdministratorGuard implements Guard {
  async check(context: CommandContext): Promise<GuardResult> {
    if (!context.guild || !context.interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return { allowed: false, message: "Administrator permission is required in a server." };
    }
    return { allowed: true };
  }
}
