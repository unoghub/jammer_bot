import { injectable } from "tsyringe";
import type { CommandContext } from "../commands/CommandContext.ts";
import type { AnyGuard } from "./Guard.ts";

@injectable()
export class GuardRunner {
  async run(
    guards: readonly AnyGuard[],
    context: CommandContext,
  ): Promise<{ allowed: true } | { allowed: false; message?: string }> {
    for (const guard of guards) {
      const result = await guard.check(context);
      if (!result.allowed) return result;
      context._setGuardData(guard, result.data);
    }
    return { allowed: true };
  }
}
