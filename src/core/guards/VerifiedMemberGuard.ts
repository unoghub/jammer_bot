import { inject, injectable } from "tsyringe";
import type { Config } from "../../config/Config.ts";
import { TOKENS } from "../../config/tokens.ts";
import type { CommandContext } from "../commands/CommandContext.ts";
import type { Guard } from "./Guard.ts";
import type { GuardResult } from "./GuardResult.ts";

@injectable()
export class VerifiedMemberGuard implements Guard {
  constructor(@inject(TOKENS.Config) private readonly config: Config) {}

  async check(context: CommandContext): Promise<GuardResult> {
    if (!context.guild) return { allowed: false, message: "Bu etkileşim yalnızca sunucuda kullanılabilir." };
    const member = await context.getActor();
    if (member.user.bot || !member.roles.cache.has(this.config.verifiedRoleId)) {
      return { allowed: false, message: "Bu etkileşim için ÜNOG Verified rolüne sahip olmalısınız." };
    }
    return { allowed: true };
  }
}
