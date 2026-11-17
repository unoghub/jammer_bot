import type { User } from "discord.js";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { jamParticipants } from "../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

@injectable()
export class ParticipationService {
  constructor(private readonly db: DatabaseService) {}
  async createParticipant(userId: string, data?: { name?: string; join_date?: Date; bio?: string }): Promise<"success" | "already_registered"> {
    const db = this.db.db;

    const participant = await db
      .insert(jamParticipants)
      .values({
        userId: userId,
        name: data?.name ?? `user_${userId}`,
        joinedAt: data?.join_date ?? new Date(),
        bio: data?.bio ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: jamParticipants.userId })
      .get();

    return participant ? "success" : "already_registered";
  }

  async removeParticipant(user: User): Promise<"success" | "not_registered"> {
    const db = this.db.db;

    const deleted = await db.delete(jamParticipants).where(eq(jamParticipants.userId, user.id)).returning({ id: jamParticipants.userId }).get();

    return deleted ? "success" : "not_registered";
  }

  async fetchParticipant(user: User): Promise<Record<string, any> | null> {
    const result = await this.db.db.select().from(jamParticipants).where(eq(jamParticipants.userId, user.id)).get();

    return result ?? null;
  }
}
