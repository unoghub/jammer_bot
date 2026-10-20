import { ChannelType, type CategoryChannel, type Guild, type TextChannel, type VoiceChannel } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamRepository, type GameJam, type JamTeam } from "./JamRepository.ts";
import { buildJamPermissions } from "./JamPermissions.ts";

const ACTIVE_CATEGORY_NAME = "Game Jam";
const ARCHIVE_CATEGORY_NAME = "Game Jam Archives";
const TEAM_LIST_CHANNEL_NAME = "jam-teams";
const MESSAGE_LENGTH_LIMIT = 2_000;
const CATEGORY_CHANNEL_LIMIT = 50;

type TeamChannelType = ChannelType.GuildText | ChannelType.GuildVoice;
type TeamChannel = TextChannel | VoiceChannel;

@injectable()
export class JamChannelService {
  constructor(private readonly repository: JamRepository) {}

  async ensureInfrastructure(guild: Guild, jam: GameJam): Promise<GameJam> {
    const active = await this.ensureCategory(guild, jam, false);
    await this.repository.updateJam(guild.id, { categoryId: active.id });

    const archive = await this.ensureCategory(guild, jam, true);
    await this.repository.updateJam(guild.id, { archiveCategoryId: archive.id });

    const list = await this.ensureTeamListChannel(guild, jam, active.id);
    await this.repository.updateJam(guild.id, { teamListChannelId: list.id });

    return { ...jam, categoryId: active.id, archiveCategoryId: archive.id, teamListChannelId: list.id };
  }

  async requireTeamCapacity(guild: Guild, categoryId: string): Promise<void> {
    const channels = await guild.channels.fetch();
    const usedSlots = channels.filter((channel) => channel?.parentId === categoryId).size;
    if (usedSlots + 2 > CATEGORY_CHANNEL_LIMIT) {
      throw new CommandError("Game Jam kategorisinde iki yeni kanal için yer kalmadı.", "JAM_CATEGORY_FULL");
    }
  }

  async syncTeam(guild: Guild, jam: GameJam, team: JamTeam, memberIds: string[]): Promise<void> {
    const archived = team.status === "archiving" || team.status === "archived";
    const parentId = archived ? jam.archiveCategoryId : jam.categoryId;
    if (!parentId) {
      throw new CommandError("Jam kategorileri yapılandırılmamış.", "JAM_CATEGORY_MISSING");
    }

    const permissions = buildJamPermissions(jam, guild.client.user.id, {
      memberIds,
      mode: archived ? "archive" : "active",
    });
    const textChannel = await this.ensureTeamChannel(guild, jam, team, ChannelType.GuildText, memberIds);
    await this.repository.updateTeam(team.id, { textChannelId: textChannel.id });

    const voiceChannel = await this.ensureTeamChannel(guild, jam, team, ChannelType.GuildVoice, memberIds);
    await this.repository.updateTeam(team.id, { voiceChannelId: voiceChannel.id });

    await textChannel.edit({ parent: parentId, lockPermissions: false, permissionOverwrites: permissions });
    await voiceChannel.edit({ parent: parentId, lockPermissions: false, permissionOverwrites: permissions });

    if (archived) {
      await this.disconnectVoiceMembers(voiceChannel as VoiceChannel);
    }
    if (team.status === "archiving") {
      await this.repository.finishArchive(team, memberIds);
    } else {
      await this.repository.updateTeam(team.id, { status: archived ? "archived" : "active", needsSync: false });
    }
  }

  async syncTeamList(guild: Guild, jam: GameJam, teams: JamTeam[]): Promise<void> {
    const channel = await guild.channels.fetch(jam.teamListChannelId!);
    if (channel?.type !== ChannelType.GuildText) {
      throw new CommandError("Takım listesi kanalı bulunamadı.", "TEAM_LIST_MISSING");
    }

    const names = teams.filter((team) => team.status === "active").map((team) => team.name);
    const pages = this.buildTeamListPages(names);
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = [...messages.values()]
      .filter((message) => message.author.id === guild.client.user.id)
      .sort((first, second) => first.createdTimestamp - second.createdTimestamp);

    for (const [index, content] of pages.entries()) {
      const existing = botMessages[index];
      const options = { content, allowedMentions: { parse: [] } };
      if (existing) {
        await existing.edit(options);
      } else {
        await channel.send(options);
      }
    }
    for (const extra of botMessages.slice(pages.length)) {
      await extra.delete();
    }
    await this.repository.updateJam(guild.id, { listNeedsSync: false });
  }

  private async ensureCategory(guild: Guild, jam: GameJam, archived: boolean): Promise<CategoryChannel> {
    const categoryId = archived ? jam.archiveCategoryId : jam.categoryId;
    const name = archived ? ARCHIVE_CATEGORY_NAME : ACTIVE_CATEGORY_NAME;
    const channels = await guild.channels.fetch();
    const existing = categoryId
      ? channels.get(categoryId)
      : channels.find((channel) => channel?.name === name && channel.type === ChannelType.GuildCategory);
    const permissions = buildJamPermissions(jam, guild.client.user.id, { mode: archived ? "archive" : "active" });

    if (existing) {
      if (existing.type !== ChannelType.GuildCategory) {
        throw new CommandError("Jam kategorisi geçersiz.", "INVALID_JAM_CATEGORY");
      }
      await existing.permissionOverwrites.set(permissions);
      return existing;
    }
    return guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: permissions });
  }

  private async ensureTeamListChannel(guild: Guild, jam: GameJam, categoryId: string): Promise<TextChannel> {
    const channels = await guild.channels.fetch();
    const existing = jam.teamListChannelId
      ? channels.get(jam.teamListChannelId)
      : channels.find((channel) => channel?.parentId === categoryId &&
        channel.name === TEAM_LIST_CHANNEL_NAME && channel.type === ChannelType.GuildText);
    const permissions = buildJamPermissions(jam, guild.client.user.id, { mode: "list" });

    if (existing) {
      if (existing.type !== ChannelType.GuildText) {
        throw new CommandError("Takım listesi kanalı geçersiz.", "INVALID_TEAM_LIST_CHANNEL");
      }
      await existing.edit({ parent: categoryId, lockPermissions: false, permissionOverwrites: permissions });
      return existing;
    }
    return guild.channels.create({
      name: TEAM_LIST_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: permissions,
    });
  }

  private async ensureTeamChannel(
    guild: Guild, jam: GameJam, team: JamTeam, type: TeamChannelType, memberIds: string[],
  ): Promise<TeamChannel> {
    const channelId = type === ChannelType.GuildText ? team.textChannelId : team.voiceChannelId;
    const name = this.teamChannelName(team);
    const channels = await guild.channels.fetch();
    const existing = channelId
      ? channels.get(channelId)
      : channels.find((channel) => channel?.type === type && channel.name === name && channel.parentId === jam.categoryId);

    if (existing) {
      if (existing.type !== type) {
        throw new CommandError("Takım kanalı türü geçersiz.", "INVALID_TEAM_CHANNEL");
      }
      return existing as TeamChannel;
    }
    if (team.status !== "creating") {
      throw new CommandError("Takım kanalı bulunamadı. Bir jam yetkilisinin kontrol etmesi gerekiyor.", "TEAM_CHANNEL_MISSING");
    }
    return guild.channels.create({
      name,
      type,
      parent: jam.categoryId,
      permissionOverwrites: buildJamPermissions(jam, guild.client.user.id, { memberIds }),
    });
  }

  private teamChannelName(team: JamTeam): string {
    const slug = team.name.toLocaleLowerCase("en")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "");
    return `${slug || "team"}-${team.id.slice(0, 8)}`;
  }

  private async disconnectVoiceMembers(channel: VoiceChannel): Promise<void> {
    for (const member of channel.members.values()) {
      await member.voice.disconnect("Game Jam team archived");
    }
  }

  private buildTeamListPages(names: string[]): string[] {
    const pages: string[] = [];
    for (const name of names) {
      const lastIndex = pages.length - 1;
      const lastPage = pages[lastIndex];
      if (!lastPage || lastPage.length + name.length + 1 > MESSAGE_LENGTH_LIMIT) {
        pages.push(name);
      } else {
        pages[lastIndex] = `${lastPage}\n${name}`;
      }
    }
    return pages;
  }
}
