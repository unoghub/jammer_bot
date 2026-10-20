import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ChannelType, OverwriteType, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { container } from "tsyringe";
import { CommandRegistry } from "../../src/core/commands/CommandRegistry.ts";
import { DatabaseService } from "../../src/infrastructure/database/DatabaseService.ts";
import { registerJamModule } from "../../src/modules/jam/index.ts";
import { requiredJamBotPermissions } from "../../src/modules/jam/services/JamPermissions.ts";
import { createFixture, createServices, FakeGuild, ids } from "./fixtures.ts";

let fixture: Awaited<ReturnType<typeof createFixture>>;

beforeEach(async () => {
  fixture = await createFixture();
});

afterEach(() => {
  fixture.database.close();
});

async function join(...userIds: string[]) {
  for (const userId of userIds) {
    await fixture.gameJam.join(fixture.guild, userId);
  }
}

describe("jam participation", () => {
  test("setup is idempotent, uses existing roles, and is restricted to administrators", async () => {
    const { gameJam, guild, fakeGuild } = fixture;
    await gameJam.setup(guild, ids.administrator, ids.participantRole, ids.maintainerRole);
    expect(fakeGuild.channels.cache.size).toBe(3);
    expect(fakeGuild.roles.create).not.toHaveBeenCalled();
    await expect(gameJam.setup(guild, ids.owner, ids.participantRole, ids.maintainerRole))
      .rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });

  test("joining and leaving reconcile the participant role without duplicate records", async () => {
    const { gameJam, guild, fakeGuild, repository } = fixture;
    await join(ids.owner, ids.owner);
    const member = fakeGuild.members.cache.get(ids.owner)!;
    expect(await repository.isParticipant(guild.id, member.id)).toBe(true);
    expect(member.roles.cache.has(ids.participantRole)).toBe(true);
    await gameJam.leave(guild, member.id);
    expect(await repository.isParticipant(guild.id, member.id)).toBe(false);
    expect(member.roles.cache.has(ids.participantRole)).toBe(false);
  });

  test("setup works without bot administrator permission and does not overwrite Manage Roles", async () => {
    const { gameJam, guild, fakeGuild } = fixture;
    const bot = fakeGuild.members.cache.get(ids.bot)!;
    bot.permissions.remove(PermissionFlagsBits.Administrator).add(requiredJamBotPermissions);
    await gameJam.setup(guild, ids.administrator, ids.participantRole, ids.maintainerRole);
    for (const channel of fakeGuild.channels.cache.values()) {
      for (const overwrite of channel.overwrites) {
        expect(new PermissionsBitField(overwrite.allow).has(PermissionFlagsBits.ManageRoles)).toBe(false);
        expect(new PermissionsBitField(overwrite.deny).has(PermissionFlagsBits.ManageRoles)).toBe(false);
      }
    }
  });

  test("blacklisting removes even a manually granted role and blocks future joins", async () => {
    const { gameJam, guild, fakeGuild, repository } = fixture;
    const member = fakeGuild.members.cache.get(ids.owner)!;
    await member.roles.add(ids.participantRole);
    await gameJam.blacklist(guild, ids.maintainer, member.id);
    expect(member.roles.cache.has(ids.participantRole)).toBe(false);
    expect(await repository.isParticipant(guild.id, member.id)).toBe(false);
    await expect(gameJam.join(guild, member.id)).rejects.toMatchObject({ code: "JAM_BLACKLISTED" });
    await gameJam.unblacklist(guild, ids.maintainer, member.id);
    expect(member.roles.cache.has(ids.participantRole)).toBe(false);
    await gameJam.join(guild, member.id);
    expect(member.roles.cache.has(ids.participantRole)).toBe(true);
  });

  test("moderation rejects ordinary users and protects administrators", async () => {
    const { gameJam, guild, repository } = fixture;
    await expect(gameJam.blacklist(guild, ids.owner, ids.member))
      .rejects.toMatchObject({ code: "JAM_MAINTAINER_REQUIRED" });
    await expect(gameJam.blacklist(guild, ids.maintainer, ids.administrator))
      .rejects.toMatchObject({ code: "JAM_ADMIN_PROTECTED" });
    expect(await repository.isBlacklisted(guild.id, ids.administrator)).toBe(false);
    await join(ids.owner);
    await gameJam.kick(guild, ids.maintainer, ids.owner);
    expect(await repository.isBlacklisted(guild.id, ids.owner)).toBe(false);
    await gameJam.join(guild, ids.owner);
  });

  test("database changes survive a failed Discord role update and can be retried", async () => {
    const { gameJam, guild, fakeGuild, database, repository } = fixture;
    await join(ids.owner);
    fakeGuild.members.cache.get(ids.owner)!.roles.remove.mockRejectedValueOnce(new Error("Discord unavailable"));
    await expect(gameJam.blacklist(guild, ids.maintainer, ids.owner)).rejects.toThrow("Discord unavailable");
    expect(await repository.isBlacklisted(guild.id, ids.owner)).toBe(true);
    expect(await repository.isParticipant(guild.id, ids.owner)).toBe(false);
    const restarted = createServices(database);
    await restarted.gameJam.synchronize(guild, ids.maintainer);
    expect(fakeGuild.members.cache.get(ids.owner)!.roles.cache.has(ids.participantRole)).toBe(false);
  });

  test("membership and blacklists are isolated by guild", async () => {
    const { gameJam, guild, repository } = fixture;
    const otherGuild = new FakeGuild("100000000000000099").asGuild();
    await gameJam.setup(otherGuild, ids.administrator, ids.participantRole, ids.maintainerRole);
    await gameJam.blacklist(guild, ids.maintainer, ids.owner);
    await gameJam.join(otherGuild, ids.owner);
    expect(await repository.isParticipant(otherGuild.id, ids.owner)).toBe(true);
    expect(await repository.isParticipant(guild.id, ids.owner)).toBe(false);
  });
});

describe("team channels", () => {
  test("members share a private text and voice channel; maintainers can always see them", async () => {
    const { teams, guild, fakeGuild, repository } = fixture;
    await join(ids.owner, ids.member, ids.outsider);
    const team = await teams.create(guild, ids.owner, "Takım Bir");
    const jam = (await repository.getJam(guild.id))!;
    await teams.addMember(guild, ids.owner, ids.member);

    const channels = [fakeGuild.channels.cache.get(team.textChannelId!)!, fakeGuild.channels.cache.get(team.voiceChannelId!)!];
    expect(channels.map((channel) => channel.type)).toEqual([ChannelType.GuildText, ChannelType.GuildVoice]);
    for (const channel of channels) {
      expect(channel.parentId).toBe(jam.categoryId);
      for (const userId of [ids.owner, ids.member, ids.maintainer]) {
        const permissions = channel.permissionsFor(fakeGuild, fakeGuild.members.cache.get(userId)!);
        expect(permissions.has(PermissionFlagsBits.ViewChannel)).toBe(true);
      }
      const outsiderPermissions = channel.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.outsider)!);
      expect(outsiderPermissions.has(PermissionFlagsBits.ViewChannel)).toBe(false);
      expect(channel.overwrites.find((overwrite) => overwrite.id === ids.member)?.type).toBe(OverwriteType.Member);
    }
    expect(fakeGuild.roles.create).not.toHaveBeenCalled();
  });

  test("the team list contains names only and is read-only for participants and maintainers", async () => {
    const { teams, guild, fakeGuild, repository } = fixture;
    await join(ids.owner);
    await teams.create(guild, ids.owner, "First Team");
    const jam = (await repository.getJam(guild.id))!;
    const list = fakeGuild.channels.cache.get(jam.teamListChannelId!)!;
    expect([...list.posts.values()].map((message) => message.content)).toEqual(["First Team"]);
    for (const userId of [ids.owner, ids.maintainer]) {
      const permissions = list.permissionsFor(fakeGuild, fakeGuild.members.cache.get(userId)!);
      expect(permissions.has(PermissionFlagsBits.ViewChannel)).toBe(true);
      expect(permissions.has(PermissionFlagsBits.SendMessages)).toBe(false);
      expect(permissions.has(PermissionFlagsBits.SendMessagesInThreads)).toBe(false);
    }
    expect(list.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.outsider)!).has(PermissionFlagsBits.ViewChannel)).toBe(false);
    expect(list.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.bot)!).has(PermissionFlagsBits.SendMessages)).toBe(true);
  });

  test("owners cannot manage another team and concurrent requests cannot double-book a member", async () => {
    const { teams, guild, repository } = fixture;
    await join(ids.owner, ids.member, ids.outsider);
    const results = await Promise.allSettled([
      teams.create(guild, ids.owner, "First Team"),
      teams.create(guild, ids.owner, "Second Team"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await repository.teams(guild.id)).toHaveLength(1);
    await teams.create(guild, ids.member, "Other Team");
    await expect(teams.disband(guild, ids.owner, "Other Team"))
      .rejects.toMatchObject({ code: "TEAM_MANAGEMENT_DENIED" });
    await expect(teams.addMember(guild, ids.owner, ids.member))
      .rejects.toMatchObject({ code: "ALREADY_IN_TEAM" });
  });

  test("force-disband archives the existing channels and preserves messages", async () => {
    const { teams, guild, fakeGuild, repository } = fixture;
    await join(ids.owner, ids.member);
    const team = await teams.create(guild, ids.owner, "Archived Team");
    await teams.addMember(guild, ids.owner, ids.member);
    const text = fakeGuild.channels.cache.get(team.textChannelId!)!;
    const voice = fakeGuild.channels.cache.get(team.voiceChannelId!)!;
    await text.send({ content: "Keep our history" });
    voice.members.set(ids.owner, fakeGuild.members.cache.get(ids.owner)!);
    const originalIds = [...fakeGuild.channels.cache.keys()];

    await teams.disband(guild, ids.maintainer, team.name);
    const jam = (await repository.getJam(guild.id))!;
    expect([...fakeGuild.channels.cache.keys()]).toEqual(originalIds);
    expect([...text.posts.values()][0]?.content).toBe("Keep our history");
    for (const channel of [text, voice]) {
      expect(channel.parentId).toBe(jam.archiveCategoryId);
      expect(channel.delete).not.toHaveBeenCalled();
      expect(channel.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.maintainer)!).has(PermissionFlagsBits.ViewChannel)).toBe(true);
      expect(channel.edit.mock.calls.at(-1)?.[0].lockPermissions).toBe(false);
    }
    expect(fakeGuild.members.cache.get(ids.owner)!.voice.disconnect).toHaveBeenCalled();
    expect((await repository.getTeam(guild.id, team.id))?.status).toBe("archived");
    expect(await repository.memberTeam(guild.id, ids.owner)).toBeUndefined();
    expect(fakeGuild.channels.cache.get(jam.teamListChannelId!)!.posts.size).toBe(0);
    await teams.create(guild, ids.owner, team.name);
    expect(await repository.teams(guild.id)).toHaveLength(2);
  });

  test("a partially failed archive resumes after restart without deleting or duplicating channels", async () => {
    const { teams, guild, fakeGuild, repository, database } = fixture;
    await join(ids.owner);
    const team = await teams.create(guild, ids.owner, "Retry Archive");
    const voice = fakeGuild.channels.cache.get(team.voiceChannelId!)!;
    voice.edit.mockRejectedValueOnce(new Error("Discord unavailable"));
    await expect(teams.disband(guild, ids.owner)).rejects.toThrow("Discord unavailable");
    expect((await repository.getTeam(guild.id, team.id))?.status).toBe("archiving");
    expect(await repository.memberTeam(guild.id, ids.owner)).toBeDefined();

    await createServices(database).gameJam.synchronize(guild, ids.maintainer);
    expect((await repository.getTeam(guild.id, team.id))?.status).toBe("archived");
    expect(fakeGuild.channels.cache.size).toBe(5);
    expect(voice.delete).not.toHaveBeenCalled();
  });

  test("partial channel creation resumes using the same text channel", async () => {
    const { teams, guild, fakeGuild, repository, database } = fixture;
    await join(ids.owner);
    fakeGuild.channels.create
      .mockImplementationOnce(async (options) => fakeGuild.createChannel(options))
      .mockRejectedValueOnce(new Error("Voice creation failed"));
    await expect(teams.create(guild, ids.owner, "Retry Create")).rejects.toThrow("Voice creation failed");
    const pending = (await repository.memberTeam(guild.id, ids.owner))!;
    expect(pending.textChannelId).not.toBeNull();
    expect(pending.voiceChannelId).toBeNull();

    await createServices(database).gameJam.synchronize(guild, ids.maintainer);
    const finished = (await repository.getTeam(guild.id, pending.id))!;
    expect(finished.status).toBe("active");
    expect(finished.textChannelId).toBe(pending.textChannelId);
    expect(fakeGuild.channels.cache.size).toBe(5);
  });
});

test("the module resolves through dependency injection and builds valid slash commands", () => {
  const app = container.createChildContainer();
  app.registerInstance(DatabaseService, fixture.database);
  app.registerSingleton(CommandRegistry);
  registerJamModule(app);
  const commands = app.resolve(CommandRegistry).all().map((command) => command.data.toJSON());
  expect(commands.map((command) => command.name).sort()).toEqual(["jam", "jam-setup", "joinjam", "leavejam", "team"]);
});
