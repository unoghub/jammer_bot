import { SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { GameJamService } from "../services/GameJamService.ts";

@injectable()
export class JoinGameJam extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("joinjam")
    .setDescription("Game Jam'e katıl")
    .setDMPermission(false);

  override readonly cooldown = 3_000;

  constructor(private readonly gameJam: GameJamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const guild = context.requireGuild();
    await context.defer(true);
    await this.gameJam.join(guild, context.user.id);
    await context.editReply("Game Jam'e katıldınız!");
  }
}
