import type { Guild } from "discord.js";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../../config/Config.ts";
import { TOKENS } from "../../../config/tokens.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamAccessService } from "./JamAccessService.ts";
import { JamChannelService } from "./JamChannelService.ts";
import { JamOperationService } from "./JamOperationService.ts";
import { JamRepository, type JamTeam } from "./JamRepository.ts";

const TEAM_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,49}$/u;

@injectable()
export class TeamService {
  constructor(
    private readonly repository: JamRepository,
    private readonly access: JamAccessService,
    private readonly operations: JamOperationService,
    private readonly channels: JamChannelService,
    @inject(TOKENS.Config) private readonly config: Config,
  ) {}

  async create(guild: Guild, ownerId: string, input: string): Promise<JamTeam> {
    return this.operations.run(guild, async (jam) => {
      await this.access.requireParticipant(guild, jam, ownerId);
      const name = input.normalize("NFKC").trim();
      if (!TEAM_NAME_PATTERN.test(name)) {
        throw new CommandError("Takım adı 1–50 karakter olmalı; harf, rakam, boşluk, tire ve alt çizgi içerebilir.", "INVALID_TEAM_NAME");
      }
      let team = await this.repository.memberTeam(guild.id, ownerId);
      if (team && (team.ownerId !== ownerId || team.name !== name || !["creating", "active"].includes(team.status))) {
        throw new CommandError("Zaten bir takımda bulunuyorsunuz.", "ALREADY_IN_TEAM");
      }
      if (!team) {
        if (await this.repository.findTeam(guild.id, name)) {
          throw new CommandError("Bu takım adı kullanılıyor.", "TEAM_NAME_TAKEN");
        }
        if (!jam.categoryId) throw new CommandError("Önce /jam-setup ile kanal kurulumunu tamamlayın.", "JAM_CATEGORY_MISSING");
        await this.channels.requireTeamCapacity(guild, jam.categoryId);
        team = await this.repository.createTeam(guild.id, ownerId, name);
      }
      const result = await this.channels.configureTeam(guild, jam, team);
      await this.channels.updateTeamList(guild, jam);
      return result;
    });
  }

  async addMember(guild: Guild, teamId: string, userId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      const team = await this.requireTeam(guild.id, teamId);
      if (team.status !== "active") throw new CommandError("Takım aktif değil.", "TEAM_NOT_ACTIVE");
      await this.access.requireParticipant(guild, jam, userId);
      const existingTeam = await this.repository.memberTeam(guild.id, userId);
      if (existingTeam && existingTeam.id !== team.id) {
        throw new CommandError("Kullanıcı zaten başka bir takımda.", "ALREADY_IN_TEAM");
      }
      const memberIds = await this.repository.memberIds(team.id);
      if (!existingTeam) {
        if (memberIds.length >= this.config.jamMaxTeamMembers) {
          throw new CommandError("Takım üye sınırına ulaştı.", "TEAM_FULL");
        }
        await this.repository.addMember(team, userId);
        memberIds.push(userId);
      }
      await this.channels.configureTeam(guild, jam, team, memberIds);
    });
  }

  async disband(guild: Guild, teamId: string): Promise<void> {
    await this.operations.run(guild, async (jam) => {
      let team = await this.requireTeam(guild.id, teamId);
      if (team.status !== "archived") {
        team = await this.repository.updateTeam(team.id, { status: "archiving" });
        await this.channels.configureTeam(guild, jam, team);
      }
      await this.channels.updateTeamList(guild, jam);
    });
  }

  async findTeam(guildId: string, userId: string, name?: string): Promise<JamTeam> {
    const team = name?.trim()
      ? await this.repository.findTeam(guildId, name)
      : await this.repository.memberTeam(guildId, userId);
    if (!team) throw new CommandError("Takım bulunamadı.", "TEAM_NOT_FOUND");
    return team;
  }

  private async requireTeam(guildId: string, teamId: string): Promise<JamTeam> {
    const team = await this.repository.getTeam(guildId, teamId);
    if (!team) throw new CommandError("Takım bulunamadı.", "TEAM_NOT_FOUND");
    return team;
  }
}
