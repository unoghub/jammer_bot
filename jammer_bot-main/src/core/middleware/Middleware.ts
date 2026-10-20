import type { CommandContext } from "../commands/CommandContext.ts";

export interface Middleware {
  execute(context: CommandContext, next: () => Promise<void>): Promise<void>;
}
