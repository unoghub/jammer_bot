import { injectable } from "tsyringe";
import type { Guard } from "../../../core/guards/Guard";
import { TeamService } from "../services/TeamService";
import type { GuardResult } from "../../../core/guards/GuardResult";
import type { CommandContext } from "../../../core/commands/CommandContext";

@injectable()
export class TeamOwnerGuard implements Guard {
  constructor(private readonly team: TeamService) {}
  async check(context: CommandContext): Promise<GuardResult> {
    if (await this.team.isTeamOwner(context.user.id)) {
      return {
        allowed: true,
      };
    }
    return {
      allowed: false,
      message: "You must be the team owner to use this command.",
    };
  }
}
