import { ChannelType, escapeMarkdown, type Guild, type TextChannel, type VoiceChannel } from "discord.js";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../../config/Config.ts";
import { TOKENS } from "../../../config/tokens.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamRepository, type GameJam, type JamTeam } from "./JamRepository.ts";
import { buildJamPermissions } from "./JamPermissions.ts";

const MESSAGE_LENGTH_LIMIT = 2_000;
const CATEGORY_CHANNEL_LIMIT = 50;

@injectable()
export class JamChannelService {
  constructor(
    private readonly repository: JamRepository,
    @inject(TOKENS.Config) private readonly config: Config,
  ) {}

  async ensureInfrastructure(guild: Guild, jam: GameJam): Promise<GameJam> {
    const channels = await guild.channels.fetch();
    const settings = [
      { key: "categoryId", id: this.config.jamCategoryId, name: this.config.jamCategoryName, type: ChannelType.GuildCategory, mode: "active" },
      { key: "archiveCategoryId", id: this.config.jamArchiveCategoryId, name: this.config.jamArchiveCategoryName, type: ChannelType.GuildCategory, mode: "archive" },
      { key: "teamListChannelId", id: this.config.jamTeamListChannelId, name: this.config.jamTeamListChannelName, type: ChannelType.GuildText, mode: "list" },
    ] as const;
    const configured = { ...jam };

    for (const setting of settings) {
      const id = setting.id || configured[setting.key];
      const existing = id ? channels.get(id) : channels.find((channel) =>
        channel?.type === setting.type && channel.name === setting.name &&
        (setting.type === ChannelType.GuildCategory || channel.parentId === configured.categoryId));
      if (setting.id && !existing) {
        throw new CommandError(".env içinde belirtilen jam kanalı bulunamadı.", "JAM_CHANNEL_MISSING");
      }
      if (existing && existing.type !== setting.type) {
        throw new CommandError(".env veya veritabanındaki jam kanalının türü geçersiz.", "INVALID_JAM_CHANNEL");
      }
      const permissionOverwrites = buildJamPermissions(jam, guild.client.user.id, { mode: setting.mode });
      const options = { name: setting.name, permissionOverwrites };
      const parent = setting.type === ChannelType.GuildText ? configured.categoryId : undefined;
      const channel = existing
        ? await existing.edit({ ...options, ...(parent ? { parent, lockPermissions: false } : {}) })
        : await guild.channels.create({ ...options, type: setting.type, parent });
      configured[setting.key] = channel.id;
      await this.repository.updateJam(guild.id, { [setting.key]: channel.id });
    }
    return configured;
  }

  async requireTeamCapacity(guild: Guild, categoryId: string, existingIds: string[] = []): Promise<void> {
    const channels = await guild.channels.fetch();
    const usedSlots = channels.filter((channel) => channel?.parentId === categoryId).size;
    const neededSlots = 2 - existingIds.filter((id) => channels.get(id)?.parentId === categoryId).length;
    if (usedSlots + neededSlots > CATEGORY_CHANNEL_LIMIT) {
      throw new CommandError("Jam kategorisinde takım kanalları için yer kalmadı.", "JAM_CATEGORY_FULL");
    }
  }

  async configureTeam(guild: Guild, jam: GameJam, team: JamTeam, memberIds?: string[]): Promise<JamTeam> {
    memberIds ??= await this.repository.memberIds(team.id);
    const archived = team.status === "archiving" || team.status === "archived";
    const parent = archived ? jam.archiveCategoryId : jam.categoryId;
    if (!parent) throw new CommandError("Jam kategorileri yapılandırılmamış.", "JAM_CATEGORY_MISSING");
    if (archived) await this.requireTeamCapacity(guild, parent, [team.textChannelId, team.voiceChannelId].filter((id): id is string => Boolean(id)));
    const name = team.name.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    const permissionOverwrites = buildJamPermissions(jam, guild.client.user.id, {
      memberIds, mode: archived ? "archive" : "active",
    });

    for (const [key, type] of [
      ["textChannelId", ChannelType.GuildText],
      ["voiceChannelId", ChannelType.GuildVoice],
    ] as const) {
      const channelId = team[key];
      const existing = channelId ? await guild.channels.fetch(channelId) : null;
      if (existing && existing.type !== type) {
        throw new CommandError("Takım kanalı türü geçersiz.", "INVALID_TEAM_CHANNEL");
      }
      if (!existing && team.status !== "creating") {
        throw new CommandError("Kayıtlı takım kanalı bulunamadı. Bir jam yetkilisi kontrol etmeli.", "TEAM_CHANNEL_MISSING");
      }
      const options = { name, parent, permissionOverwrites };
      const channel = existing
        ? await existing.edit({ ...options, lockPermissions: false })
        : await guild.channels.create({ ...options, type });
      if (channel.id !== channelId) {
        team = await this.repository.updateTeam(team.id, { [key]: channel.id });
      }
      if (archived && channel.type === ChannelType.GuildVoice) {
        for (const member of (channel as VoiceChannel).members.values()) {
          await member.voice.disconnect("Game Jam team archived");
        }
      }
    }
    if (team.status === "archiving") {
      return this.repository.finishArchive(team, memberIds);
    }
    return team.status === "creating"
      ? this.repository.updateTeam(team.id, { status: "active" })
      : team;
  }

  async updateTeamList(guild: Guild, jam: GameJam): Promise<void> {
    const channel = jam.teamListChannelId ? await guild.channels.fetch(jam.teamListChannelId) : null;
    if (channel?.type !== ChannelType.GuildText) {
      throw new CommandError("Takım listesi kanalı bulunamadı.", "TEAM_LIST_MISSING");
    }
    const teams = await this.repository.teams(guild.id);
    const pages: string[] = [];
    for (const team of teams) {
      if (team.status !== "active") continue;
      const name = escapeMarkdown(team.name);
      const index = pages.length - 1;
      const last = pages[index];
      if (!last || last.length + name.length + 1 > MESSAGE_LENGTH_LIMIT) pages.push(name);
      else pages[index] = `${last}\n${name}`;
    }
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = [...messages.values()]
      .filter((message) => message.author.id === guild.client.user.id)
      .sort((first, second) => first.createdTimestamp - second.createdTimestamp);
    for (const [index, content] of pages.entries()) {
      const options = { content, allowedMentions: { parse: [] } };
      const existing = botMessages[index];
      if (existing) {
        if (existing.content !== content) await existing.edit(options);
      } else {
        await (channel as TextChannel).send(options);
      }
    }
    for (const extra of botMessages.slice(pages.length)) await extra.delete();
  }
}
