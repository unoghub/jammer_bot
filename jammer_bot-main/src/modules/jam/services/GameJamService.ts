import type { Guild } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamAccessService } from "./JamAccessService.ts";
import { JamChannelService } from "./JamChannelService.ts";
import { JamOperationService } from "./JamOperationService.ts";
import { JamRepository } from "./JamRepository.ts";

@injectable()
export class GameJamService {
  constructor(
    private readonly repository: JamRepository,
    private readonly access: JamAccessService,
    private readonly channels: JamChannelService,
    private readonly operations: JamOperationService,
  ) {}

  async setup(guild: Guild, actorId: string, participantRoleId: string, maintainerRoleId: string): Promise<void> {
    await this.operations.serialize(guild.id, async () => {
      await this.access.requireAdministrator(guild, actorId);
      await this.access.validateRoles(guild, participantRoleId, maintainerRoleId);
      const existing = await this.repository.getJam(guild.id);
      const rolesChanged = existing && (
        existing.participantRoleId !== participantRoleId || existing.maintainerRoleId !== maintainerRoleId
      );
      if (rolesChanged) {
        throw new CommandError("Bu jam zaten farklı rollerle yapılandırılmış.", "JAM_ALREADY_CONFIGURED");
      }
      if (!existing) {
        await this.repository.createJam(guild.id, participantRoleId, maintainerRoleId);
      }

      const jam = await this.operations.requireJam(guild.id);
      await this.channels.ensureInfrastructure(guild, jam);
      await this.operations.syncPending(guild);
    });
  }

  async join(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, async () => {
      await this.access.requireEligibleMember(guild, userId);
      await this.repository.setParticipant(guild.id, userId, true);
    });
  }

  async leave(guild: Guild, userId: string): Promise<void> {
    await this.operations.run(guild, async () => {
      await this.repository.setParticipant(guild.id, userId, false);
    });
  }

  async kick(guild: Guild, actorId: string, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      await this.access.requireMaintainer(guild, jam, actorId);
      await this.access.requireModeratableMember(guild, userId);
      await this.repository.setParticipant(guild.id, userId, false);
    });
  }

  async blacklist(guild: Guild, actorId: string, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      await this.access.requireMaintainer(guild, jam, actorId);
      await this.access.requireModeratableMember(guild, userId);
      await this.repository.blacklist(guild.id, userId, actorId);
    });
  }

  async unblacklist(guild: Guild, actorId: string, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      await this.access.requireMaintainer(guild, jam, actorId);
      await this.repository.unblacklist(guild.id, userId);
    });
  }

  async synchronize(guild: Guild, actorId: string): Promise<void> {
    await this.operations.serialize(guild.id, async () => {
      const jam = await this.operations.requireJam(guild.id);
      await this.access.requireMaintainer(guild, jam, actorId);
      await this.access.validateRoles(guild, jam.participantRoleId, jam.maintainerRoleId);
      await this.channels.ensureInfrastructure(guild, jam);
      await this.repository.markAllForSync(guild.id);
      await this.operations.syncPending(guild);
    });
  }
}
