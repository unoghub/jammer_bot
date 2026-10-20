import { DiscordAPIError, type Guild } from "discord.js";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../config/tokens.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import type { Logger } from "../../../infrastructure/logger/Logger.ts";

@injectable()
export class ModerationService {
  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) {}

  async ban(guild: Guild, userId: string, moderatorId: string, reason?: string): Promise<void> {
    try {
      await guild.members.ban(userId, { reason: reason ?? `Banned by ${moderatorId}` });
      this.logger.info("Member banned", { guildId: guild.id, userId, moderatorId });
    } catch (error) {
      this.logger.error("Discord ban request failed", { guildId: guild.id, userId, err: error });
      if (error instanceof DiscordAPIError && error.code === 50013) {
        throw new CommandError("I need the Ban Members permission and a higher role to ban this user.", "BAN_FORBIDDEN");
      }
      throw error;
    }
  }
}
