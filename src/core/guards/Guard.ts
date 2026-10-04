import type { CommandContext } from "../commands/CommandContext.ts";
import type { GuardResult } from "./GuardResult.ts";

export interface Guard {
  check(context: CommandContext): Promise<GuardResult>;
}
