import type { Guild } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamAccessService } from "./JamAccessService.ts";
import { JamChannelService } from "./JamChannelService.ts";
import { JamRepository, type GameJam } from "./JamRepository.ts";

@injectable()
export class JamOperationService {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly repository: JamRepository,
    private readonly channels: JamChannelService,
    private readonly access: JamAccessService,
  ) {}

  async serialize<T>(guildId: string, action: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(guildId) ?? Promise.resolve();
    const current = previous.then(action, action);
    this.queues.set(guildId, current);

    try {
      return await current;
    } finally {
      if (this.queues.get(guildId) === current) {
        this.queues.delete(guildId);
      }
    }
  }

  async requireJam(guildId: string): Promise<GameJam> {
    const jam = await this.repository.getJam(guildId);
    if (!jam) {
      throw new CommandError("Önce bir yönetici /jam-setup komutunu kullanmalı.", "JAM_NOT_CONFIGURED");
    }
    return jam;
  }

  async run<T>(guild: Guild, action: (jam: GameJam) => Promise<T>): Promise<T> {
    return this.serialize(guild.id, async () => {
      await this.syncPending(guild);
      const jam = await this.requireJam(guild.id);
      const result = await action(jam);
      await this.syncPending(guild);
      return result;
    });
  }

  async syncPending(guild: Guild): Promise<void> {
    let jam = await this.requireJam(guild.id);
    if (!jam.categoryId || !jam.archiveCategoryId || !jam.teamListChannelId) {
      jam = await this.channels.ensureInfrastructure(guild, jam);
    }

    for (const team of await this.repository.teams(guild.id)) {
      if (!team.needsSync) continue;
      const members = await this.repository.members(team.id);
      await this.channels.syncTeam(guild, jam, team, members.map((member) => member.userId));
    }

    for (const participant of await this.repository.pendingParticipants(guild.id)) {
      const member = await this.access.findMember(guild, participant.userId);
      if (member) {
        if (participant.active) {
          await member.roles.add(jam.participantRoleId);
        } else {
          await member.roles.remove(jam.participantRoleId);
        }
      }
      await this.repository.participantSynced(guild.id, participant.userId);
    }

    const latest = await this.requireJam(guild.id);
    if (latest.listNeedsSync) {
      const teams = await this.repository.teams(guild.id);
      await this.channels.syncTeamList(guild, latest, teams);
    }
  }
}
