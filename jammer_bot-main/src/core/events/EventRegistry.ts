import { injectable } from "tsyringe";
import type { Event } from "./Event.ts";

@injectable()
export class EventRegistry {
  private readonly events: Event[] = [];

  register(event: Event): void {
    if (this.events.some((existing) => existing.name === event.name && existing.constructor === event.constructor)) {
      throw new Error(`Duplicate event registration: ${event.name}`);
    }
    this.events.push(event);
  }

  all(): readonly Event[] { return [...this.events]; }
}
