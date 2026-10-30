import type { User } from "discord.js";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService";
import {
  jamTeamMembers,
  jamTeams,
} from "../../../infrastructure/database/schema";
import { CommandError } from "../../../core/errors/CommandError";

@injectable()
export class TeamService {
  constructor(private readonly db: DatabaseService) {}

  async createTeam(data: {
    name: string;
    owner: User;
    create_date?: Date;
  }): Promise<string> {
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
          throw new CommandError(
            "Team name already exists",
            "TEAM_NAME_EXISTS",
          );
        }

        if (message.includes("jam_team_members.user_id")) {
          throw new CommandError(
            "User is already a member of a team",
            "USER_ALREADY_MEMBER",
          );
        }

        throw error;
      });

    return data.name;
  }

  async addTeamMember(
    user: User,
    teamId: string,
    owner: boolean = false,
  ): Promise<void> {
    const db = this.db.db;

    const result = await db
      .insert(jamTeamMembers)
      .values({
        teamId,
        userId: user.id,
        isOwner: owner,
      })
      .onConflictDoNothing({ target: jamTeamMembers.userId })
      .returning({
        userId: jamTeamMembers.userId,
        teamId: jamTeamMembers.teamId,
      });

    if (result.length === 0) {
      throw new CommandError(
        "User is already a member of this team",
        "USER_ALREADY_MEMBER",
      );
    }
  }
}
