import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { GameJamService } from "../services/GameJamService.ts";

@injectable()
export class JamSetupCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("jam-setup")
    .setDescription("Game Jam rollerini ve kanallarını yapılandır")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) => option
      .setName("participant")
      .setDescription("Mevcut Jam Participant rolü")
      .setRequired(true))
    .addRoleOption((option) => option
      .setName("maintainer")
      .setDescription("Mevcut Jam Maintainer rolü")
      .setRequired(true));

  override readonly cooldown = 3_000;

  constructor(private readonly gameJam: GameJamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const guild = context.requireGuild();
    const participant = context.options.getRole("participant", true);
    const maintainer = context.options.getRole("maintainer", true);
    await context.defer(true);
    await this.gameJam.setup(guild, context.user.id, participant.id, maintainer.id);
    await context.editReply("Game Jam kategorileri ve takım listesi hazır.");
  }
}
