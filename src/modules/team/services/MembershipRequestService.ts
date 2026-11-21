import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { jamTeamMemberRequests, jamTeamMembers } from "../../../infrastructure/database/schema";
import { CommandError } from "../../../core/errors/CommandError";
import { and, DrizzleQueryError, eq, lt, sql } from "drizzle-orm";
import { LibsqlError } from "@libsql/client";
import { TeamService } from "./TeamService";

@injectable()
export class MembershipRequestService {
  constructor(
    private readonly db: DatabaseService,
    private readonly team: TeamService,
  ) {}
  async request(userId: string, teamId: string): Promise<void> {
    const db = this.db.db;

    const membership = await this.team.fetchMembershipFromUser(userId);

    if (membership) {
      if (membership.teamId === teamId) {
        throw new CommandError("You are already a member of this team.", "ALREADY_MEMBER");
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
        userId: userId,
        teamId: teamId,
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
      throw new CommandError("You have already requested to join this team.", "ALREADY_REQUESTED");
    }
  }

  private handleRequest(
    userId: string,
    teamId: string,
    action: "accept",
  ): Promise<{
    status: "not_found" | "expired" | "accepted";
  }>;

  private handleRequest(
    userId: string,
    teamId: string,
    action: "deny",
  ): Promise<{
    status: "not_found" | "expired" | "denied";
  }>;

  private async handleRequest(
    userId: string,
    teamId: string,
    action: "accept" | "deny",
  ): Promise<{
    status: "not_found" | "expired" | "accepted" | "denied";
  }> {
    const db = this.db.db;

    return db.transaction(async (tx) => {
      const request = await tx.query.jamTeamMemberRequests.findFirst({
        where: and(
          eq(jamTeamMemberRequests.userId, userId),
          eq(jamTeamMemberRequests.teamId, teamId),
          eq(jamTeamMemberRequests.type, "request"),
        ),
      });

      if (!request) {
        return { status: "not_found" } as const;
      }

      if (request.expiresAt !== null && request.expiresAt <= new Date()) {
        await tx
          .delete(jamTeamMemberRequests)
          .where(
            and(eq(jamTeamMemberRequests.userId, userId), eq(jamTeamMemberRequests.teamId, teamId)),
          );

        return { status: "expired" } as const;
      }

      await tx.delete(jamTeamMemberRequests).where(eq(jamTeamMemberRequests.userId, userId));

      if (action === "accept") {
        return { status: "accepted" } as const;
      }

      return { status: "denied" } as const;
    });
  }

  async accept(
    userId: string,
    teamId: string,
  ): Promise<{ status: "not_found" | "expired" | "accepted" | "already_member" }> {
    const result = await this.handleRequest(userId, teamId, "accept");
    if (result.status === "accepted") {
      const r = await this.team.addTeamMember(userId, teamId);
      if (r === "already_member") {
        return { status: "already_member" };
      }
    }
    return result;
  }

  async deny(
    userId: string,
    teamId: string,
  ): Promise<{ status: "not_found" | "expired" | "denied" }> {
    return this.handleRequest(userId, teamId, "deny");
  }
}
