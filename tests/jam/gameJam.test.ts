import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ChannelType, OverwriteType, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { container } from "tsyringe";
import { CommandRegistry } from "../../src/core/commands/CommandRegistry.ts";
import { EventRegistry } from "../../src/core/events/EventRegistry.ts";
import { TOKENS } from "../../src/config/tokens.ts";
import { DatabaseService } from "../../src/infrastructure/database/DatabaseService.ts";
import { registerJamModule } from "../../src/modules/jam/index.ts";
import { requiredJamBotPermissions } from "../../src/modules/jam/services/JamPermissions.ts";
import { config, createFixture, createServices, FakeGuild, ids } from "./fixtures.ts";

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
  test("setup is idempotent and uses existing roles", async () => {
    const { gameJam, guild, fakeGuild } = fixture;
    await gameJam.setup(guild);
    expect(fakeGuild.channels.cache.size).toBe(3);
    expect(fakeGuild.roles.create).not.toHaveBeenCalled();
  });

  test("joining and leaving update the participant role without duplicate records", async () => {
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
    await gameJam.setup(guild);
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
    await gameJam.unblacklist(guild, member.id);
    expect(member.roles.cache.has(ids.participantRole)).toBe(false);
    await gameJam.join(guild, member.id);
    expect(member.roles.cache.has(ids.participantRole)).toBe(true);
  });

  test("moderation protects administrators and a kick does not blacklist", async () => {
    const { gameJam, guild, repository } = fixture;
    await expect(gameJam.blacklist(guild, ids.maintainer, ids.administrator))
      .rejects.toMatchObject({ code: "JAM_ADMIN_PROTECTED" });
    expect(await repository.isBlacklisted(guild.id, ids.administrator)).toBe(false);
    await join(ids.owner);
    await gameJam.kick(guild, ids.owner);
    expect(await repository.isBlacklisted(guild.id, ids.owner)).toBe(false);
    await gameJam.join(guild, ids.owner);
  });

  test("database changes survive a failed Discord role update and can be retried", async () => {
    const { gameJam, guild, fakeGuild, database, repository } = fixture;
    await join(ids.owner);
    fakeGuild.members.cache.get(ids.owner)!.roles.remove.mockRejectedValueOnce(new Error("Discord unavailable"));
    await expect(gameJam.blacklist(guild, ids.maintainer, ids.owner)).rejects.toThrow("Discord unavailable");
    expect(await repository.isBlacklisted(guild.id, ids.owner)).toBe(true);
    expect(await repository.isParticipant(guild.id, ids.owner)).toBe(true);
    const restarted = createServices(database);
    await restarted.gameJam.blacklist(guild, ids.maintainer, ids.owner);
    expect(fakeGuild.members.cache.get(ids.owner)!.roles.cache.has(ids.participantRole)).toBe(false);
  });

  test("membership and blacklists are isolated by guild", async () => {
    const { gameJam, guild, repository } = fixture;
    const otherGuild = new FakeGuild("100000000000000099").asGuild();
    await gameJam.setup(otherGuild);
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
    await teams.addMember(guild, team.id, ids.member);

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

  test("concurrent requests cannot double-book a member", async () => {
    const { teams, guild, repository } = fixture;
    await join(ids.owner, ids.member, ids.outsider);
    const results = await Promise.allSettled([
      teams.create(guild, ids.owner, "First Team"),
      teams.create(guild, ids.owner, "Second Team"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await repository.teams(guild.id)).toHaveLength(1);
    await teams.create(guild, ids.member, "Other Team");
    const first = (await repository.memberTeam(guild.id, ids.owner))!;
    await expect(teams.addMember(guild, first.id, ids.member))
      .rejects.toMatchObject({ code: "ALREADY_IN_TEAM" });
  });

  test("force-disband archives the existing channels and preserves messages", async () => {
    const { teams, guild, fakeGuild, repository } = fixture;
    await join(ids.owner, ids.member);
    const team = await teams.create(guild, ids.owner, "Archived Team");
    await teams.addMember(guild, team.id, ids.member);
    const text = fakeGuild.channels.cache.get(team.textChannelId!)!;
    const voice = fakeGuild.channels.cache.get(team.voiceChannelId!)!;
    await text.send({ content: "Keep our history" });
    voice.members.set(ids.owner, fakeGuild.members.cache.get(ids.owner)!);
    const originalIds = [...fakeGuild.channels.cache.keys()];

    await teams.disband(guild, team.id);
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
    await expect(teams.disband(guild, team.id)).rejects.toThrow("Discord unavailable");
    expect((await repository.getTeam(guild.id, team.id))?.status).toBe("archiving");
    expect(await repository.memberTeam(guild.id, ids.owner)).toBeDefined();

    await createServices(database).teams.disband(guild, team.id);
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

    await createServices(database).teams.create(guild, ids.owner, "Retry Create");
    const finished = (await repository.getTeam(guild.id, pending.id))!;
    expect(finished.status).toBe("active");
    expect(finished.textChannelId).toBe(pending.textChannelId);
    expect(fakeGuild.channels.cache.size).toBe(5);
  });
});

test("the module resolves through dependency injection and builds valid slash commands", () => {
  const app = container.createChildContainer();
  app.registerInstance(DatabaseService, fixture.database);
  app.registerInstance(TOKENS.Config, config);
  app.registerSingleton(CommandRegistry);
  app.registerSingleton(EventRegistry);
  registerJamModule(app);
  const commands = app.resolve(CommandRegistry).all().map((command) => command.data.toJSON());
  expect(commands.map((command) => command.name).sort()).toEqual(["jam", "jam-setup", "joinjam", "leavejam", "team"]);
});

test("team add accepts an existing participant role without a database participation record", async () => {
  const { gameJam, guild, fakeGuild, teams, repository } = fixture;
  await gameJam.join(guild, ids.owner);
  const team = await teams.create(guild, ids.owner, "Role Based Access");
  await fakeGuild.members.cache.get(ids.member)!.roles.add(ids.participantRole);
  expect(await repository.isParticipant(guild.id, ids.member)).toBe(false);
  await teams.addMember(guild, team.id, ids.member);
  expect((await repository.memberTeam(guild.id, ids.member))?.id).toBe(team.id);
});

test("an old participation record cannot replace the current Discord role", async () => {
  const { gameJam, guild, fakeGuild, teams, repository } = fixture;
  await join(ids.owner, ids.member);
  const team = await teams.create(guild, ids.owner, "Fresh Roles");
  fakeGuild.members.cache.get(ids.member)!.roles.cache.delete(ids.participantRole);
  expect(await repository.isParticipant(guild.id, ids.member)).toBe(true);
  await expect(teams.addMember(guild, team.id, ids.member)).rejects.toMatchObject({ code: "JAM_PARTICIPANT_REQUIRED" });
  expect(await repository.memberTeam(guild.id, ids.member)).toBeUndefined();
  await gameJam.join(guild, ids.member);
  await teams.addMember(guild, team.id, ids.member);
});

test("an unverified target cannot join or receive team access", async () => {
  const { gameJam, guild, fakeGuild, teams } = fixture;
  await join(ids.owner, ids.member);
  const team = await teams.create(guild, ids.owner, "Verified Members");
  fakeGuild.members.cache.get(ids.member)!.roles.cache.delete(ids.verifiedRole);
  await expect(gameJam.join(guild, ids.member)).rejects.toMatchObject({ code: "VERIFIED_REQUIRED" });
  await expect(teams.addMember(guild, team.id, ids.member)).rejects.toMatchObject({ code: "VERIFIED_REQUIRED" });
  expect(fakeGuild.channels.cache.get(team.textChannelId!)!.overwrites.some((overwrite) => overwrite.id === ids.member)).toBe(false);
});

test("channel names contain only the team slug and colliding slugs remain separate", async () => {
  const { teams, guild, fakeGuild } = fixture;
  await join(ids.owner, ids.member);
  const first = await teams.create(guild, ids.owner, "Same Name");
  const second = await teams.create(guild, ids.member, "Same_Name");
  expect(first.textChannelId).not.toBe(second.textChannelId);
  expect(first.voiceChannelId).not.toBe(second.voiceChannelId);
  for (const team of [first, second]) {
    const text = fakeGuild.channels.cache.get(team.textChannelId!)!;
    const voice = fakeGuild.channels.cache.get(team.voiceChannelId!)!;
    expect(text.name).toBe("same-name");
    expect(voice.name).toBe("same-name");
    expect(text.overwrites.some((overwrite) => overwrite.id === team.ownerId)).toBe(true);
  }
});

test("setup updates stored channel names and repairs overwritten permissions", async () => {
  const { gameJam, teams, guild, fakeGuild } = fixture;
  await join(ids.owner);
  const team = await teams.create(guild, ids.owner, "Existing Team");
  const text = fakeGuild.channels.cache.get(team.textChannelId!)!;
  text.name = "existing-team-old-id";
  text.overwrites = [];
  const channelCount = fakeGuild.channels.cache.size;
  await gameJam.setup(guild);
  expect(text.name).toBe("existing-team");
  expect(fakeGuild.channels.cache.size).toBe(channelCount);
  expect(text.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.outsider)!).has(PermissionFlagsBits.ViewChannel)).toBe(false);
  expect(text.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.maintainer)!).has(PermissionFlagsBits.ViewChannel)).toBe(true);
});

test("joining does not scan teams or repair an unrelated failed channel", async () => {
  const { gameJam, teams, guild, fakeGuild } = fixture;
  await join(ids.owner);
  const team = await teams.create(guild, ids.owner, "Unrelated Team");
  fakeGuild.channels.cache.delete(team.textChannelId!);
  const fetchCount = fakeGuild.channels.fetch.mock.calls.length;
  await gameJam.join(guild, ids.member);
  expect(fakeGuild.channels.fetch.mock.calls.length).toBe(fetchCount);
  expect(fakeGuild.members.cache.get(ids.member)!.roles.cache.has(ids.participantRole)).toBe(true);
});

test("a failed channel permission update can be retried without duplicate members", async () => {
  const { teams, guild, fakeGuild, repository } = fixture;
  await join(ids.owner, ids.member);
  const team = await teams.create(guild, ids.owner, "Retry Permissions");
  fakeGuild.channels.cache.get(team.voiceChannelId!)!.edit.mockRejectedValueOnce(new Error("Missing permissions"));
  await expect(teams.addMember(guild, team.id, ids.member)).rejects.toThrow("Missing permissions");
  await teams.addMember(guild, team.id, ids.member);
  expect(await repository.memberIds(team.id)).toHaveLength(2);
  for (const channelId of [team.textChannelId!, team.voiceChannelId!]) {
    const channel = fakeGuild.channels.cache.get(channelId)!;
    expect(channel.permissionsFor(fakeGuild, fakeGuild.members.cache.get(ids.member)!).has(PermissionFlagsBits.ViewChannel)).toBe(true);
  }
});
