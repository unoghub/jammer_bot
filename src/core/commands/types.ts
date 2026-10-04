import type { Guard } from "../guards/Guard.ts";

export interface CommandPolicy {
  readonly guards?: readonly Guard[];
  /** Cooldown duration in milliseconds, per user and command. */
  readonly cooldown?: number;
}
