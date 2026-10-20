import { SlashCommandBuilder, type SlashCommandSubcommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { GameJamService } from "../services/GameJamService.ts";

function withUserOption(command: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return command.addUserOption((option) => option
    .setName("user")
    .setDescription("İşlem yapılacak kullanıcı")
    .setRequired(true));
}

@injectable()
export class JamModerationCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("jam")
    .setDescription("Game Jam yönetimi")
    .setDMPermission(false)
    .addSubcommand((command) => withUserOption(command.setName("kick").setDescription("Kullanıcıyı jam'den çıkar")))
    .addSubcommand((command) => withUserOption(command.setName("blacklist").setDescription("Kullanıcıyı kara listeye al")))
    .addSubcommand((command) => withUserOption(command.setName("unblacklist").setDescription("Kullanıcıyı kara listeden çıkar")))
    .addSubcommand((command) => command.setName("sync").setDescription("Jam rollerini ve kanal izinlerini eşitle"));

  override readonly cooldown = 3_000;

  constructor(private readonly gameJam: GameJamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const guild = context.requireGuild();
    const action = context.options.getSubcommand();
    const actorId = context.user.id;
    await context.defer(true);

    if (action === "sync") {
      await this.gameJam.synchronize(guild, actorId);
      await context.editReply("Jam rolleri ve kanalları eşitlendi.");
      return;
    }

    const userId = context.options.getUser("user", true).id;
    switch (action) {
      case "kick":
        await this.gameJam.kick(guild, actorId, userId);
        await context.editReply("Kullanıcı jam'den çıkarıldı.");
        return;
      case "blacklist":
        await this.gameJam.blacklist(guild, actorId, userId);
        await context.editReply("Kullanıcı kara listeye alındı ve katılımcı rolü kaldırıldı.");
        return;
      case "unblacklist":
        await this.gameJam.unblacklist(guild, actorId, userId);
        await context.editReply("Kullanıcı kara listeden çıkarıldı; /joinjam ile yeniden katılabilir.");
        return;
    }
  }
}
