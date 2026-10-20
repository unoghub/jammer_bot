import type { Guard } from "../guards/Guard.ts";

export interface CommandPolicy {
  readonly guards?: readonly Guard[];
  readonly cooldown?: number;
}
