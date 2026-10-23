import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../../config/Config.ts";
import { TOKENS } from "../../../config/tokens.ts";
import { Event } from "../../../core/events/Event.ts";
import { GameJamService } from "../services/GameJamService.ts";
import { JamRepository } from "../services/JamRepository.ts";

@injectable()
export class VerifiedRoleRemoved extends Event<"guildMemberUpdate"> {
  readonly name = Events.GuildMemberUpdate;

  constructor(
    private readonly gameJam: GameJamService,
    private readonly repository: JamRepository,
    @inject(TOKENS.Config) private readonly config: Config,
  ) { super(); }

  async execute(previous: GuildMember | PartialGuildMember, member: GuildMember): Promise<void> {
    const roleId = this.config.verifiedRoleId;
    if (!previous.roles.cache.has(roleId) || member.roles.cache.has(roleId)) return;
    if (!await this.repository.getJam(member.guild.id)) return;
    await this.gameJam.leave(member.guild, member.id);
  }
}
