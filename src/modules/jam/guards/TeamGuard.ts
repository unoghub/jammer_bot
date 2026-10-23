import { injectable } from "tsyringe";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import type { Guard } from "../../../core/guards/Guard.ts";
import type { GuardResult } from "../../../core/guards/GuardResult.ts";
import { JamAccessService } from "../services/JamAccessService.ts";
import { JamOperationService } from "../services/JamOperationService.ts";
import { TeamService } from "../services/TeamService.ts";

@injectable()
export class TeamGuard implements Guard {
  private readonly authorizedTeams = new WeakMap<CommandContext, string>();

  constructor(
    private readonly teams: TeamService,
    private readonly access: JamAccessService,
    private readonly operations: JamOperationService,
  ) {}

  async check(context: CommandContext): Promise<GuardResult> {
    const guild = context.requireGuild();
    const jam = await this.operations.requireJam(guild.id);
    const actor = await context.getActor();
    if (context.action === "create") {
      await this.access.requireParticipant(guild, jam, actor);
    }
    if (context.action !== "add" && context.action !== "disband") return { allowed: true };
    const maintainer = this.access.isMaintainer(actor, jam);
    if (!context.isModalSubmit && maintainer) return { allowed: true };
    const name = context.isModalSubmit ? context.fields.getTextInputValue("team") : undefined;
    const team = await this.teams.findTeam(guild.id, actor.id, name);
    if (!maintainer && team.ownerId !== actor.id) {
      return { allowed: false, message: "Takım sahibi veya jam yetkilisi olmalısınız." };
    }
    this.authorizedTeams.set(context, team.id);
    return { allowed: true };
  }

  teamId(context: CommandContext): string {
    const teamId = this.authorizedTeams.get(context);
    if (!teamId) throw new CommandError("Takım yetkisi doğrulanamadı.", "TEAM_MANAGEMENT_DENIED");
    return teamId;
  }
}
