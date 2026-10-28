import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../../core/commands/Command";
import type { CommandContext } from "../../../core/commands/CommandContext";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { injectable } from "tsyringe";
import { jamParticipants } from "../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

@injectable()
export class JoinJamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("join-jam")
    .setDescription("Join a game jam");

  constructor(private readonly db: DatabaseService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const db = this.db.db;

    const userId = context.interaction.user.id;
    const result = await db
      .select({
        id: jamParticipants.userId,
      })
      .from(jamParticipants)
      .where(eq(jamParticipants.userId, userId))
      .limit(1);

    if (result.length > 0) {
      // TODO : make this throw an exception
      await context.reply({
        content: "You are already in the jam.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await db.insert(jamParticipants).values({
      userId: userId,
      name: context.interaction.user.username,
      bio: "",
      joinedAt: new Date(),
    });

    await context.reply({
      content: "You have successfully joined the jam!",
      flags: [MessageFlags.Ephemeral],
    });
  }
}
