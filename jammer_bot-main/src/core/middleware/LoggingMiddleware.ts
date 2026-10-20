import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";
import type { CommandContext } from "../commands/CommandContext.ts";
import type { Middleware } from "./Middleware.ts";

@injectable()
export class LoggingMiddleware implements Middleware {
  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) {}

  async execute(context: CommandContext, next: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
      await next();
    } finally {
      this.logger.info("Command handled", {
        command: context.interaction.commandName,
        userId: context.user.id,
        durationMs: Date.now() - start,
      });
    }
  }
}
