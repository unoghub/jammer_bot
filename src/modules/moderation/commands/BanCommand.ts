import { ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputStyle } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { textField, userField } from "../../../core/commands/ModalFields.ts";
import { AdministratorGuard } from "../guards/AdministratorGuard.ts";
import { ModerationService } from "../services/ModerationService.ts";

@injectable()
export class BanCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);
  override readonly guards;
  override readonly modalActions = ["confirm"];

  constructor(private readonly moderation: ModerationService, administratorGuard: AdministratorGuard) {
    super();
    this.guards = [administratorGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.showModal(new ModalBuilder().setCustomId("ban:confirm").setTitle("Ban a user")
      .addLabelComponents(
        userField("user", "User"),
        textField("reason", "Reason", { maxLength: 512, style: TextInputStyle.Paragraph, required: false }),
      ));
  }

  override async executeModal(context: CommandContext): Promise<void> {
    await context.defer(true);
    const user = context.fields.getSelectedUsers("user", true).first()!;
    const reason = context.fields.getTextInputValue("reason").trim() || undefined;
    await this.moderation.ban(context.requireGuild(), user.id, context.user.id, reason);
    await context.editReply(`Banned ${user.tag}.`);
  }
}
