import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { jamParticipants } from "../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

export type ParticipantData = {
  userId: string;
  name: string;
  bio: string | null;
  joinedAt: Date | null;
};

@injectable()
export class ParticipationService {
  constructor(private readonly db: DatabaseService) {}
  async createParticipant(
    userId: string,
    data?: { name?: string; join_date?: Date; bio?: string },
  ): Promise<"success" | "already_registered"> {
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

  async removeParticipant(userId: string): Promise<"success" | "not_registered"> {
    const db = this.db.db;

    const deleted = await db
      .delete(jamParticipants)
      .where(eq(jamParticipants.userId, userId))
      .returning({ id: jamParticipants.userId })
      .get();

    return deleted ? "success" : "not_registered";
  }

  async fetchParticipant(userId: string): Promise<ParticipantData | null> {
    const result = await this.db.db
      .select()
      .from(jamParticipants)
      .where(eq(jamParticipants.userId, userId))
      .get();

    return result ?? null;
  }
}
