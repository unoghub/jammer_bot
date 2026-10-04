import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { AdministratorGuard } from "../guards/AdministratorGuard.ts";
import { ModerationService } from "../services/ModerationService.ts";

@injectable()
export class BanCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption((option) => option.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the ban").setMaxLength(512));
  override readonly guards;

  constructor(
    private readonly moderation: ModerationService,
    administratorGuard: AdministratorGuard,
  ) {
    super();
    this.guards = [administratorGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    if (!context.guild) throw new CommandError("This command can only be used in a server.", "GUILD_REQUIRED");
    const user = context.options.getUser("user", true);
    const reason = context.options.getString("reason") ?? undefined;
    if (user.id === context.user.id) throw new CommandError("You cannot ban yourself.", "SELF_BAN");
    await context.defer(true);
    await this.moderation.ban(context.guild, user.id, context.user.id, reason);
    await context.editReply(`Banned ${user.tag}.`);
  }
}
