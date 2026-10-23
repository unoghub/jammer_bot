import type { Guild, GuildMember } from "discord.js";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../../config/Config.ts";
import { TOKENS } from "../../../config/tokens.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamAccessService } from "./JamAccessService.ts";
import { JamChannelService } from "./JamChannelService.ts";
import { JamOperationService } from "./JamOperationService.ts";
import { JamRepository, type GameJam } from "./JamRepository.ts";

@injectable()
export class GameJamService {
  constructor(
    private readonly repository: JamRepository,
    private readonly access: JamAccessService,
    private readonly channels: JamChannelService,
    private readonly operations: JamOperationService,
    @inject(TOKENS.Config) private readonly config: Config,
  ) {}

  async setup(guild: Guild): Promise<void> {
    await this.operations.serialize(guild.id, async () => {
      await this.access.validateRoles(guild);
      const existing = await this.repository.getJam(guild.id);
      const { jamParticipantRoleId, jamMaintainerRoleId } = this.config;
      if (existing && (existing.participantRoleId !== jamParticipantRoleId || existing.maintainerRoleId !== jamMaintainerRoleId)) {
        throw new CommandError("Bu jam farklı rollerle yapılandırılmış. .env rol ID'lerini kontrol edin.", "JAM_ALREADY_CONFIGURED");
      }
      const configured = existing ?? await this.repository.createJam(guild.id, jamParticipantRoleId, jamMaintainerRoleId);
      const jam = await this.channels.ensureInfrastructure(guild, configured);
      for (const team of await this.repository.teams(guild.id)) {
        await this.channels.configureTeam(guild, jam, team);
      }
      await this.channels.updateTeamList(guild, jam);
    });
  }

  async join(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const member = await this.access.requireEligibleMember(guild, userId);
      await member.roles.add(jam.participantRoleId);
      await this.repository.setParticipant(guild.id, userId, true);
    });
  }

  async leave(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const member = await this.access.findMember(guild, userId);
      await this.removeParticipant(jam, userId, member);
    });
  }

  async kick(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const member = await this.access.requireModeratableMember(guild, userId);
      await this.removeParticipant(jam, userId, member);
    });
  }

  async blacklist(guild: Guild, actorId: string, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const member = await this.access.requireModeratableMember(guild, userId);
      await this.repository.blacklist(guild.id, userId, actorId);
      await this.removeParticipant(jam, userId, member);
    });
  }

  async unblacklist(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, () => this.repository.unblacklist(guild.id, userId));
  }

  private async removeParticipant(jam: GameJam, userId: string, member: GuildMember | null): Promise<void> {
    if (member) await member.roles.remove(jam.participantRoleId);
    await this.repository.setParticipant(jam.guildId, userId, false);
  }
}
