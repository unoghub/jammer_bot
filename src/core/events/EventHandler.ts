import { inject, injectable } from "tsyringe";
import type { Client, ClientEvents } from "discord.js";
import { TOKENS } from "../../config/tokens.ts";
import type { Logger } from "../../infrastructure/logger/Logger.ts";
import { EventRegistry } from "./EventRegistry.ts";

@injectable()
export class EventHandler {
  private readonly cleanup: Array<() => void> = [];

  constructor(
    private readonly registry: EventRegistry,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  attach(client: Client): void {
    for (const event of this.registry.all()) {
      const listener = (...args: unknown[]) => {
        void Promise.resolve().then(() => event.execute(...(args as ClientEvents[typeof event.name]))).catch((err: unknown) => {
          this.logger.error("Event handler failed", { event: event.name, err });
        });
      };
      if (event.once) client.once(event.name, listener);
      else client.on(event.name, listener);
      this.cleanup.push(() => client.off(event.name, listener));
    }
  }

  detach(): void {
    for (const remove of this.cleanup.splice(0)) remove();
  }
}
