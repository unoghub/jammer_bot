import { ModalBuilder, SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { userField } from "../../../core/commands/ModalFields.ts";
import { JamMaintainerGuard } from "../guards/JamMaintainerGuard.ts";
import { GameJamService } from "../services/GameJamService.ts";

@injectable()
export class JamModerationCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("jam")
    .setDescription("Game Jam yönetimi")
    .setDMPermission(false)
    .addSubcommand((command) => command.setName("kick").setDescription("Kullanıcıyı jam'den çıkar"))
    .addSubcommand((command) => command.setName("blacklist").setDescription("Kullanıcıyı kara listeye al"))
    .addSubcommand((command) => command.setName("unblacklist").setDescription("Kullanıcıyı kara listeden çıkar"));
  override readonly cooldown = 3_000;
  override readonly modalActions = ["kick", "blacklist", "unblacklist"];
  override readonly guards;

  constructor(private readonly gameJam: GameJamService, maintainer: JamMaintainerGuard) {
    super();
    this.guards = [maintainer];
  }

  async execute(context: CommandContext): Promise<void> {
    const titles: Record<string, string> = {
      kick: "Jam'den çıkar", blacklist: "Kara listeye al", unblacklist: "Kara listeden çıkar",
    };
    await context.showModal(new ModalBuilder().setCustomId(`jam:${context.action}`).setTitle(titles[context.action]!)
      .addLabelComponents(userField("user", "İşlem yapılacak kullanıcı")));
  }

  override async executeModal(context: CommandContext): Promise<void> {
    await context.defer(true);
    const guild = context.requireGuild();
    const userId = context.fields.getSelectedUsers("user", true).first()!.id;
    switch (context.action) {
      case "kick":
        await this.gameJam.kick(guild, userId);
        await context.editReply("Kullanıcı jam'den çıkarıldı.");
        return;
      case "blacklist":
        await this.gameJam.blacklist(guild, context.user.id, userId);
        await context.editReply("Kullanıcı kara listeye alındı ve katılımcı rolü kaldırıldı.");
        return;
      case "unblacklist":
        await this.gameJam.unblacklist(guild, userId);
        await context.editReply("Kullanıcı kara listeden çıkarıldı; /joinjam ile yeniden katılabilir.");
    }
  }
}
