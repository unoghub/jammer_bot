import { injectable } from "tsyringe";
import type { Guard } from "../../../core/guards/Guard";
import { TeamService, type TeamMembershipState } from "../services/TeamService";
import type { GuardResult } from "../../../core/guards/GuardResult";
import type { CommandContext } from "../../../core/commands/CommandContext";

@injectable()
export class TeamOwnerGuard implements Guard<TeamMembershipState> {
  constructor(private readonly team: TeamService) {}
  async check(context: CommandContext): Promise<GuardResult<TeamMembershipState>> {
    const ownerMembership = await this.team.fetchMembershipFromUser(context.user.id);
    if (ownerMembership?.isOwner) {
      return {
        allowed: true,
        data: ownerMembership,
      };
    }
    return {
      allowed: false,
      message: "You must be the team owner to use this command.",
    };
  }
}
