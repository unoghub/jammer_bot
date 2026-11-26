import type { AnyGuard } from "../guards/Guard.ts";

export interface CommandPolicy {
  readonly guards?: readonly AnyGuard[];
  /** Cooldown duration in milliseconds, per user and command. */
  readonly cooldown?: number;
}
