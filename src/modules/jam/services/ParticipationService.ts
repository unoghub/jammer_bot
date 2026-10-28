import type { User } from "discord.js";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { jamParticipants } from "../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../infrastructure/logger/Logger";
import { CommandError } from "../../../core/errors/CommandError";

@injectable()
export class ParticipationService {
  constructor(private readonly db: DatabaseService) {}
  async createParticipant(
    user: User,
    data?: { join_date?: Date; bio?: string },
  ): Promise<void> {
    const db = this.db.db;

    const result = await db
      .select({ id: jamParticipants.userId })
      .from(jamParticipants)
      .where(eq(jamParticipants.userId, user.id))
      .limit(1);

    if (result.length > 0) {
      throw new CommandError(
        "User already registered as a participant.",
        "USER_ALREADY_REGISTERED",
      );
    }

    await db.insert(jamParticipants).values({
      userId: user.id,
      name: user.username,
      bio: data?.bio,
      joinedAt: data?.join_date,
    });
  }

  async removeParticipant(user: User): Promise<User | void> {
    const db = this.db.db;

    const deleted = await db
      .delete(jamParticipants)
      .where(eq(jamParticipants.userId, user.id))
      .returning({ id: jamParticipants.userId });

    if (deleted.length === 0) {
      return;
    }

    return user;
  }
}
