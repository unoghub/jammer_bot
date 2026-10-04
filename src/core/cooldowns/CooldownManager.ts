import { injectable } from "tsyringe";

@injectable()
export class CooldownManager {
  private readonly expirations = new Map<string, Map<string, number>>();
  private nextSweep = 0;

  /** Returns remaining milliseconds, or zero when the cooldown is acquired. */
  acquire(commandName: string, userId: string, durationMs: number, now = Date.now()): number {
    if (durationMs <= 0) return 0;
    if (now >= this.nextSweep) {
      this.prune(now);
      this.nextSweep = now + 60_000;
    }
    let users = this.expirations.get(commandName);
    if (!users) {
      users = new Map();
      this.expirations.set(commandName, users);
    }
    const expires = users.get(userId) ?? 0;
    if (expires > now) return expires - now;
    users.set(userId, now + durationMs);
    return 0;
  }

  clear(): void { this.expirations.clear(); }

  private prune(now: number): void {
    for (const [command, users] of this.expirations) {
      for (const [user, expiration] of users) {
        if (expiration <= now) users.delete(user);
      }
      if (users.size === 0) this.expirations.delete(command);
    }
  }
}
