import type { Client } from "discord.js";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens.ts";
import { Event } from "../../core/events/Event.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";

@injectable()
export class ReadyEvent extends Event<"clientReady"> {
  readonly name = "clientReady";
  override readonly once = true;

  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) { super(); }

  async execute(client: Client<true>): Promise<void> {
    this.logger.info(`Logged in as ${client.user.tag}`);
  }
}
