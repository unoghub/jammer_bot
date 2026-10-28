import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { injectable } from "tsyringe";
import { jamParticipants } from "../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

@injectable()
export class LeaveJamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("leave-jam")
    .setDescription("Leave the game jam");

  constructor(private readonly db: DatabaseService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const db = this.db.db;

    const userId = context.interaction.user.id;

    const deleted = await db
      .delete(jamParticipants)
      .where(eq(jamParticipants.userId, userId))
      .returning({ userId: jamParticipants.userId });

    if (deleted.length > 0) {
      await context.interaction.reply({
        content: "You have successfully left the game jam.",
        ephemeral: true,
      });
    } else {
      await context.interaction.reply({
        content: "You are not currently participating in the game jam.",
        ephemeral: true,
      });
    }
  }
}
