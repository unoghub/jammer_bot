import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command";
import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { AdministratorGuard } from "../../moderation/guards/AdministratorGuard";
import type { CommandContext } from "../../../core/commands/CommandContext";

@injectable()
export class SetVerifiedRoleCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("set_verified_role")
    .setDescription("Sets the verified role for the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts([InteractionContextType.Guild])
    .addRoleOption((option) =>
      option.setName("role").setDescription("Verified role").setRequired(true),
    );
  override readonly guards;

  constructor(administratorGuard: AdministratorGuard) {
    super();
    this.guards = [administratorGuard];
  }

  override async execute(context: CommandContext): Promise<void> {
    await context.reply(
      `this will be used for verified user role check (if exists)`,
    );
  }
}
