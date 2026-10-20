import type { Guild } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamAccessService } from "./JamAccessService.ts";
import { JamChannelService } from "./JamChannelService.ts";
import { JamOperationService } from "./JamOperationService.ts";
import { JamRepository, type GameJam, type JamTeam } from "./JamRepository.ts";

const MAX_TEAM_MEMBERS = 90;
const TEAM_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,49}$/u;

@injectable()
export class TeamService {
  constructor(
    private readonly repository: JamRepository,
    private readonly access: JamAccessService,
    private readonly operations: JamOperationService,
    private readonly channels: JamChannelService,
  ) {}

  async create(guild: Guild, ownerId: string, input: string): Promise<JamTeam> {
    const teamId = await this.operations.run(guild, async (jam) => {
      await this.access.requireParticipant(guild, ownerId);
      await this.requireAvailableMember(guild.id, ownerId);
      const name = input.normalize("NFKC").trim();
      if (!TEAM_NAME_PATTERN.test(name)) {
        throw new CommandError(
          "Takım adı 1–50 harf/rakam olmalı; boşluk, tire ve alt çizgi içerebilir.",
          "INVALID_TEAM_NAME",
        );
      }

      const teams = await this.repository.teams(guild.id);
      const nameTaken = teams.some((team) => team.activeName === name.toLocaleLowerCase("en"));
      if (nameTaken) {
        throw new CommandError("Bu takım adı kullanılıyor.", "TEAM_NAME_TAKEN");
      }
      await this.channels.requireTeamCapacity(guild, jam.categoryId!);
      return this.repository.createTeam(guild.id, ownerId, name);
    });

    return this.requireTeam(guild.id, teamId);
  }

  async addMember(guild: Guild, actorId: string, userId: string, teamName?: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const team = await this.requireManagedTeam(guild, jam, actorId, teamName);
      await this.access.requireParticipant(guild, userId);
      await this.requireAvailableMember(guild.id, userId);
      const members = await this.repository.members(team.id);
      if (members.length >= MAX_TEAM_MEMBERS) {
        throw new CommandError("Takım kanalının üye izin sınırına ulaşıldı.", "TEAM_FULL");
      }
      await this.repository.addMember(team, userId);
    });
  }

  async disband(guild: Guild, actorId: string, teamName?: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const team = await this.requireManagedTeam(guild, jam, actorId, teamName);
      await this.repository.beginArchive(team);
    });
  }

  async getMemberTeam(guild: Guild, userId: string): Promise<JamTeam> {
    const team = await this.repository.memberTeam(guild.id, userId);
    if (!team) {
      throw new CommandError("Bir takımda değilsiniz.", "TEAM_NOT_FOUND");
    }
    return team;
  }

  private async requireTeam(guildId: string, teamId: string): Promise<JamTeam> {
    const team = await this.repository.getTeam(guildId, teamId);
    if (!team) {
      throw new CommandError("Takım bulunamadı.", "TEAM_NOT_FOUND");
    }
    return team;
  }

  private async requireAvailableMember(guildId: string, userId: string): Promise<void> {
    if (await this.repository.memberTeam(guildId, userId)) {
      throw new CommandError("Kullanıcı zaten bir takımda.", "ALREADY_IN_TEAM");
    }
  }

  private async requireManagedTeam(
    guild: Guild, jam: GameJam, actorId: string, teamName?: string,
  ): Promise<JamTeam> {
    const normalizedName = teamName?.normalize("NFKC").trim().toLocaleLowerCase("en");
    const team = normalizedName
      ? (await this.repository.teams(guild.id)).find((candidate) => candidate.activeName === normalizedName)
      : await this.repository.memberTeam(guild.id, actorId);

    if (!team || team.status !== "active") {
      throw new CommandError("Aktif takım bulunamadı.", "TEAM_NOT_FOUND");
    }
    const isOwner = team.ownerId === actorId;
    if (!isOwner && !await this.access.isMaintainer(guild, jam, actorId)) {
      throw new CommandError("Takım sahibi veya jam yetkilisi olmalısınız.", "TEAM_MANAGEMENT_DENIED");
    }
    return team;
  }
}
