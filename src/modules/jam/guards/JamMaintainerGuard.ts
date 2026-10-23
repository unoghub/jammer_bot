import { injectable } from "tsyringe";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import type { Guard } from "../../../core/guards/Guard.ts";
import type { GuardResult } from "../../../core/guards/GuardResult.ts";
import { JamAccessService } from "../services/JamAccessService.ts";
import { JamOperationService } from "../services/JamOperationService.ts";

@injectable()
export class JamMaintainerGuard implements Guard {
  constructor(private readonly access: JamAccessService, private readonly operations: JamOperationService) {}

  async check(context: CommandContext): Promise<GuardResult> {
    const jam = await this.operations.requireJam(context.requireGuild().id);
    return this.access.isMaintainer(await context.getActor(), jam)
      ? { allowed: true }
      : { allowed: false, message: "Bu işlem için Jam Maintainer rolü gerekiyor." };
  }
}
