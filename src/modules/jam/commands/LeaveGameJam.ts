import { SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { GameJamService } from "../services/GameJamService.ts";

@injectable()
export class LeaveGameJam extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("leavejam")
    .setDescription("Game Jam'den ayrıl")
    .setDMPermission(false);

  override readonly cooldown = 3_000;

  constructor(private readonly gameJam: GameJamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const guild = context.requireGuild();
    await context.defer(true);
    await this.gameJam.leave(guild, context.user.id);
    await context.editReply("Game Jam'den ayrıldınız.");
  }
}
