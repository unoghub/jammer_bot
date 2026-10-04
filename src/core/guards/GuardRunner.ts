import { injectable } from "tsyringe";
import type { CommandContext } from "../commands/CommandContext.ts";
import type { Guard } from "./Guard.ts";
import type { GuardResult } from "./GuardResult.ts";

@injectable()
export class GuardRunner {
  async run(guards: readonly Guard[], context: CommandContext): Promise<GuardResult> {
    for (const guard of guards) {
      const result = await guard.check(context);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  }
}
