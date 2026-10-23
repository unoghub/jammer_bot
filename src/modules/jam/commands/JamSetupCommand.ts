import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { AdministratorGuard } from "../../moderation/guards/AdministratorGuard.ts";
import { GameJamService } from "../services/GameJamService.ts";

@injectable()
export class JamSetupCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("jam-setup")
    .setDescription("Game Jam rollerini ve kanallarını .env ayarlarıyla yapılandır")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  override readonly cooldown = 3_000;
  override readonly guards;

  constructor(private readonly gameJam: GameJamService, administrator: AdministratorGuard) {
    super();
    this.guards = [administrator];
  }

  async execute(context: CommandContext): Promise<void> {
    await context.defer(true);
    await this.gameJam.setup(context.requireGuild());
    await context.editReply("Game Jam kanalları ve takım listesi hazır.");
  }
}
