import type { User } from "discord.js";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import {
  jamTeamMemberRequests,
  jamTeamMembers,
} from "../../../infrastructure/database/schema";
import { CommandError } from "../../../core/errors/CommandError";
import { DrizzleQueryError, eq, lt, sql } from "drizzle-orm";
import { LibsqlError } from "@libsql/client";

@injectable()
export class MembershipRequestService {
  constructor(private readonly db: DatabaseService) {}
  async request(user: User, team: string): Promise<void> {
    const db = this.db.db;

    const [membership] = await db
      .select({ teamId: jamTeamMembers.teamId })
      .from(jamTeamMembers)
      .where(eq(jamTeamMembers.userId, user.id))
      .limit(1);

    if (membership) {
      if (membership.teamId === team) {
        throw new CommandError(
          "You are already a member of this team.",
          "ALREADY_MEMBER",
        );
      }

      throw new CommandError(
        "You are already a member of another team. You must leave your current team before joining a new one.",
        "ALREADY_MEMBER",
      );
    }

    const creationDate = new Date();
    const expirationDate = new Date(creationDate.getTime() + 60 * 60 * 1000); // 1 hour from creation

    const result = await db
      .insert(jamTeamMemberRequests)
      .values({
        userId: user.id,
        teamId: team,
        type: "request",
        createdAt: creationDate,
        expiresAt: expirationDate,
      })
      .onConflictDoUpdate({
        target: [jamTeamMemberRequests.userId, jamTeamMemberRequests.teamId],
        set: {
          type: sql`excluded.type`,
          createdAt: sql`excluded.created_at`,
          expiresAt: sql`excluded.expires_at`,
        },
        setWhere: lt(jamTeamMemberRequests.expiresAt, creationDate),
      })
      .returning({
        userId: jamTeamMemberRequests.userId,
        teamId: jamTeamMemberRequests.teamId,
      })
      .catch((error) => {
        if (
          error instanceof DrizzleQueryError &&
          error.cause instanceof LibsqlError &&
          error.cause.code === "SQLITE_CONSTRAINT" &&
          error.cause.message.includes("FOREIGN KEY constraint failed")
        ) {
          throw new CommandError(
            "The team you are trying to join does not exist.",
            "TEAM_NOT_FOUND",
          );
        }

        throw error;
      });

    if (result.length === 0) {
      throw new CommandError(
        "You have already requested to join this team.",
        "ALREADY_REQUESTED",
      );
    }
  }
}
