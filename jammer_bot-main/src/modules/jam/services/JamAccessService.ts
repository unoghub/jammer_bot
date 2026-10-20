import { DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes, type Guild, type GuildMember } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamRepository, type GameJam } from "./JamRepository.ts";
import { requiredJamBotPermissions } from "./JamPermissions.ts";

@injectable()
export class JamAccessService {
  constructor(private readonly repository: JamRepository) {}

  async findMember(guild: Guild, userId: string): Promise<GuildMember | null> {
    try {
      return await guild.members.fetch({ user: userId, force: true });
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMember) {
        return null;
      }
      throw error;
    }
  }

  async requireMember(guild: Guild, userId: string): Promise<GuildMember> {
    const member = await this.findMember(guild, userId);
    if (!member) {
      throw new CommandError("Kullanıcı sunucuda bulunamadı.", "MEMBER_NOT_FOUND");
    }
    return member;
  }

  async requireAdministrator(guild: Guild, userId: string): Promise<void> {
    const member = await this.requireMember(guild, userId);
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      throw new CommandError("Yönetici izni gerekiyor.", "ADMIN_REQUIRED");
    }
  }

  async isMaintainer(guild: Guild, jam: GameJam, userId: string): Promise<boolean> {
    const member = await this.requireMember(guild, userId);
    return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(jam.maintainerRoleId);
  }

  async requireMaintainer(guild: Guild, jam: GameJam, userId: string): Promise<void> {
    if (!await this.isMaintainer(guild, jam, userId)) {
      throw new CommandError("Bu işlem için Jam Maintainer rolü gerekiyor.", "JAM_MAINTAINER_REQUIRED");
    }
  }

  async requireEligibleMember(guild: Guild, userId: string): Promise<void> {
    const member = await this.requireMember(guild, userId);
    if (member.user.bot) {
      throw new CommandError("Botlar jam'e katılamaz.", "BOT_PARTICIPANT");
    }
    if (await this.repository.isBlacklisted(guild.id, userId)) {
      throw new CommandError("Kara listedeki kullanıcılar jam'e katılamaz.", "JAM_BLACKLISTED");
    }
  }

  async requireParticipant(guild: Guild, userId: string): Promise<void> {
    await this.requireEligibleMember(guild, userId);
    if (!await this.repository.isParticipant(guild.id, userId)) {
      throw new CommandError("Önce /joinjam ile jam'e katılmalısınız.", "JAM_PARTICIPANT_REQUIRED");
    }
  }

  async requireModeratableMember(guild: Guild, userId: string): Promise<void> {
    const member = await this.findMember(guild, userId);
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) {
      throw new CommandError("Yöneticiler jam'den atılamaz veya kara listeye alınamaz.", "JAM_ADMIN_PROTECTED");
    }
  }

  async validateRoles(guild: Guild, participantRoleId: string, maintainerRoleId: string): Promise<void> {
    const participant = await guild.roles.fetch(participantRoleId);
    const maintainer = await guild.roles.fetch(maintainerRoleId);
    if (!participant || !maintainer || participant.id === guild.id || maintainer.id === guild.id ||
        participant.id === maintainer.id || participant.managed) {
      throw new CommandError(
        "Farklı, mevcut katılımcı ve yetkili rolleri seçin; @everyone kullanılamaz.",
        "INVALID_JAM_ROLES",
      );
    }

    const bot = await guild.members.fetchMe();
    const canAssignParticipantRole = bot.roles.highest.comparePositionTo(participant) > 0;
    if (!bot.permissions.has(requiredJamBotPermissions) || !canAssignParticipantRole) {
      throw new CommandError(
        "Botun jam için gereken metin, ses ve yönetim izinleri eksik veya rolü katılımcı rolünden aşağıda. Kurulum rehberini kontrol edin.",
        "JAM_BOT_PERMISSIONS",
      );
    }
  }
}
