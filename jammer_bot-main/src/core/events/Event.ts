import type { ClientEvents } from "discord.js";

export abstract class Event<K extends keyof ClientEvents = keyof ClientEvents> {
  abstract readonly name: K;
  readonly once: boolean = false;
  abstract execute(...args: ClientEvents[K]): Promise<void>;
}
