import { injectable } from "tsyringe";
import type { Guard } from "../../../core/guards/Guard.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import type { GuardResult } from "../../../core/guards/GuardResult.ts";
import { ParticipationService, type ParticipantData } from "../services/ParticipationService.ts";

@injectable()
export class ParticipantGuard implements Guard<ParticipantData> {
  constructor(private readonly participation: ParticipationService) {}
  async check(context: CommandContext): Promise<GuardResult<ParticipantData>> {
    const participantData = await this.participation.fetchParticipant(context.user.id);
    if (participantData) {
      return {
        allowed: true,
        data: participantData,
      };
    }
    return {
      allowed: false,
      message: "You must be a registered participant to use this command.",
    };
  }
}
