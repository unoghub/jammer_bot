import { DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes, type Guild, type GuildMember } from "discord.js";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../../config/Config.ts";
import { TOKENS } from "../../../config/tokens.ts";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamRepository, type GameJam } from "./JamRepository.ts";
import { requiredJamBotPermissions } from "./JamPermissions.ts";

@injectable()
export class JamAccessService {
  constructor(
    private readonly repository: JamRepository,
    @inject(TOKENS.Config) private readonly config: Config,
  ) {}

  async findMember(guild: Guild, userId: string): Promise<GuildMember | null> {
    try {
      return await guild.members.fetch({ user: userId, force: true });
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMember) return null;
      throw error;
    }
  }

  isMaintainer(member: GuildMember, jam: GameJam): boolean {
    return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(jam.maintainerRoleId);
  }

  async requireEligibleMember(guild: Guild, user: string | GuildMember): Promise<GuildMember> {
    const member = typeof user === "string" ? await this.findMember(guild, user) : user;
    if (!member) throw new CommandError("Kullanıcı sunucuda bulunamadı.", "MEMBER_NOT_FOUND");
    if (member.user.bot) throw new CommandError("Botlar jam'e katılamaz.", "BOT_PARTICIPANT");
    if (!member.roles.cache.has(this.config.verifiedRoleId)) {
      throw new CommandError("Kullanıcının Verified rolü bulunmuyor.", "VERIFIED_REQUIRED");
    }
    if (await this.repository.isBlacklisted(guild.id, member.id)) {
      throw new CommandError("Kara listedeki kullanıcılar jam'e katılamaz.", "JAM_BLACKLISTED");
    }
    return member;
  }

  async requireParticipant(guild: Guild, jam: GameJam, user: string | GuildMember): Promise<GuildMember> {
    const member = await this.requireEligibleMember(guild, user);
    if (!member.roles.cache.has(jam.participantRoleId)) {
      throw new CommandError("İşlem yapılan kullanıcı Jam Participant rolüne sahip değil; önce /joinjam kullanmalı.", "JAM_PARTICIPANT_REQUIRED");
    }
    return member;
  }

  async requireModeratableMember(guild: Guild, userId: string): Promise<GuildMember | null> {
    const member = await this.findMember(guild, userId);
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) {
      throw new CommandError("Yöneticiler jam'den atılamaz veya kara listeye alınamaz.", "JAM_ADMIN_PROTECTED");
    }
    return member;
  }

  async validateRoles(guild: Guild): Promise<void> {
    const [participant, maintainer, verified] = await Promise.all([
      guild.roles.fetch(this.config.jamParticipantRoleId),
      guild.roles.fetch(this.config.jamMaintainerRoleId),
      guild.roles.fetch(this.config.verifiedRoleId),
    ]);
    if (!participant || !maintainer || !verified || participant.managed ||
        [participant.id, maintainer.id, verified.id].includes(guild.id)) {
      throw new CommandError(".env içindeki jam ve Verified rolleri geçersiz. @everyone kullanılamaz.", "INVALID_JAM_ROLES");
    }

    const bot = await guild.members.fetchMe();
    if (!bot.permissions.has(requiredJamBotPermissions) || bot.roles.highest.comparePositionTo(participant) <= 0) {
      throw new CommandError(
        "Botun kanal/rol izinleri eksik veya rolü katılımcı rolünden aşağıda. Kurulum rehberini kontrol edin.",
        "JAM_BOT_PERMISSIONS",
      );
    }
  }
}
