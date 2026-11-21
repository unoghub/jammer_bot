import type { User } from "discord.js";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import { jamTeamMembers, jamTeams } from "../../../infrastructure/database/schema";
import { CommandError } from "../../../core/errors/CommandError";
import { eq } from "drizzle-orm";

export type TeamMembershipState = {
  userId: string;
  teamId: string;
  isOwner: boolean;
};

@injectable()
export class TeamService {
  constructor(private readonly db: DatabaseService) {}

  async createTeam(data: { name: string; owner: User; create_date?: Date }): Promise<string> {
    const db = this.db.db;

    await db
      .batch([
        db.insert(jamTeams).values({
          teamId: data.name,
          createdAt: data.create_date,
        }),

        db.insert(jamTeamMembers).values({
          teamId: data.name,
          userId: data.owner.id,
          isOwner: true,
        }),
      ])
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes("jam_teams.team_id")) {
          throw new CommandError("Team name already exists", "TEAM_NAME_EXISTS");
        }

        if (message.includes("jam_team_members.user_id")) {
          throw new CommandError("User is already a member of a team", "USER_ALREADY_MEMBER");
        }

        throw error;
      });

    return data.name;
  }

  async addTeamMember(
    userId: string,
    teamId: string,
    owner: boolean = false,
  ): Promise<"success" | "already_member"> {
    const db = this.db.db;

    const result = await db
      .insert(jamTeamMembers)
      .values({
        teamId,
        userId: userId,
        isOwner: owner,
      })
      .onConflictDoNothing({ target: jamTeamMembers.userId })
      .returning({
        userId: jamTeamMembers.userId,
        teamId: jamTeamMembers.teamId,
      })
      .get();

    return result ? "success" : "already_member";
  }

  async removeTeamMember(userId: string): Promise<"success" | "not_member" | "team_deleted"> {
    const db = this.db.db;

    const membership = await this.fetchMembershipFromUser(userId);
    if (membership?.isOwner) {
      await db.delete(jamTeams).where(eq(jamTeams.teamId, membership.teamId));
      return "team_deleted";
    }

    const result = await db
      .delete(jamTeamMembers)
      .where(eq(jamTeamMembers.userId, userId))
      .returning({ userId: jamTeamMembers.userId })
      .get();

    return result ? "success" : "not_member";
  }

  // TODO : cache this query (well, you should probably cache most queries but this is more important), see TeamService::isTeamOwner().
  async fetchMembershipFromUser(userId: string): Promise<TeamMembershipState | null> {
    const db = this.db.db;

    const [result] = await db
      .select()
      .from(jamTeamMembers)
      .where(eq(jamTeamMembers.userId, userId))
      .limit(1);

    return result ?? null;
  }

  // NOTE : a slash command that has a guard case and a membership query makes two queries.
  // the way guards are structured makes it difficult to share query results between it and command execution, but caching this query will solve that.
  async isTeamOwner(userId: string): Promise<boolean> {
    const result = await this.fetchMembershipFromUser(userId);
    return result?.isOwner ?? false;
  }

  async getTeams(): Promise<string[]> {
    const db = this.db.db;

    const results = await db.select().from(jamTeams).$withCache();

    return results.map((row) => row.teamId);
  }
}
