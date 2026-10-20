import "reflect-metadata";
import { mock } from "bun:test";
import {
  ChannelType, Collection, GuildChannel, PermissionFlagsBits, PermissionsBitField,
  type Guild, type GuildMember, type OverwriteData,
} from "discord.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { DatabaseService } from "../../src/infrastructure/database/DatabaseService.ts";
import { GameJamService } from "../../src/modules/jam/services/GameJamService.ts";
import { JamAccessService } from "../../src/modules/jam/services/JamAccessService.ts";
import { JamChannelService } from "../../src/modules/jam/services/JamChannelService.ts";
import { JamOperationService } from "../../src/modules/jam/services/JamOperationService.ts";
import { JamRepository } from "../../src/modules/jam/services/JamRepository.ts";
import { TeamService } from "../../src/modules/jam/services/TeamService.ts";

export const ids = {
  guild: "100000000000000001",
  bot: "100000000000000002",
  administrator: "100000000000000003",
  maintainer: "100000000000000004",
  owner: "100000000000000005",
  member: "100000000000000006",
  outsider: "100000000000000007",
  participantRole: "100000000000000008",
  maintainerRole: "100000000000000009",
};

type FakeRole = { id: string; permissions: PermissionsBitField; managed: boolean };
type ChannelOptions = {
  name: string;
  type: ChannelType;
  parent?: string | null;
  lockPermissions?: boolean;
  permissionOverwrites?: OverwriteData[];
};

export class FakeMember {
  readonly user = { bot: false };
  readonly permissions: PermissionsBitField;
  readonly roles;
  readonly voice = { disconnect: mock(async () => {}) };

  constructor(readonly id: string, guild: FakeGuild, administrator = false) {
    this.permissions = new PermissionsBitField(administrator ? PermissionFlagsBits.Administrator : 0n);
    const cache = new Collection<string, FakeRole>([[guild.id, guild.roles.cache.get(guild.id)!]]);
    this.roles = {
      cache,
      highest: { comparePositionTo: () => 1 },
      add: mock(async (roleId: string) => { cache.set(roleId, guild.roles.cache.get(roleId)!); }),
      remove: mock(async (roleId: string) => { cache.delete(roleId); }),
    };
  }
}

class FakeMessage {
  readonly author = { id: ids.bot };
  readonly createdTimestamp = Date.now();
  readonly edit = mock(async (options: { content: string }) => {
    this.content = options.content;
    return this;
  });
  readonly delete = mock(async () => { this.channel.posts.delete(this.id); });

  constructor(readonly id: string, public content: string, private readonly channel: FakeChannel) {}
}

export class FakeChannel {
  private static nextId = 200000000000000000n;
  readonly id = String(FakeChannel.nextId++);
  readonly name: string;
  readonly type: ChannelType;
  parentId: string | null;
  overwrites: OverwriteData[];
  readonly members = new Collection<string, FakeMember>();
  readonly posts = new Collection<string, FakeMessage>();
  readonly messages = { fetch: mock(async () => new Collection(this.posts)) };
  readonly send = mock(async (options: { content: string }) => {
    const message = new FakeMessage(String(FakeChannel.nextId++), options.content, this);
    this.posts.set(message.id, message);
    return message;
  });
  readonly permissionOverwrites = {
    set: mock(async (overwrites: OverwriteData[]) => { this.overwrites = overwrites; }),
  };
  readonly edit = mock(async (options: Partial<ChannelOptions>) => {
    if (options.parent !== undefined) this.parentId = options.parent;
    if (options.permissionOverwrites) this.overwrites = options.permissionOverwrites;
    return this;
  });
  readonly delete = mock(async () => {});

  constructor(options: ChannelOptions) {
    this.name = options.name;
    this.type = options.type;
    this.parentId = options.parent ?? null;
    this.overwrites = options.permissionOverwrites ?? [];
  }

  permissionsFor(guild: FakeGuild, member: FakeMember): Readonly<PermissionsBitField> {
    const channel = Object.create(GuildChannel.prototype) as GuildChannel;
    const cache = new Collection(this.overwrites.map((overwrite) => [overwrite.id, {
      ...overwrite,
      allow: new PermissionsBitField(overwrite.allow),
      deny: new PermissionsBitField(overwrite.deny),
    }]));
    Object.assign(channel, { guild, permissionOverwrites: { cache } });
    return channel.permissionsFor(member as unknown as GuildMember)!;
  }
}

export class FakeGuild {
  readonly client = { user: { id: ids.bot } };
  readonly ownerId = ids.administrator;
  readonly roles = {
    cache: new Collection<string, FakeRole>(),
    fetch: mock(async (roleId: string) => this.roles.cache.get(roleId) ?? null),
    create: mock(async () => { throw new Error("Unexpected role creation"); }),
  };
  readonly members = {
    cache: new Collection<string, FakeMember>(),
    fetch: mock(async (options: { user: string; force: boolean }) => {
      const userId = options.user;
      const member = this.members.cache.get(userId);
      if (!member) throw new Error("Unexpected member ID");
      return member;
    }),
    fetchMe: mock(async () => this.members.cache.get(ids.bot)!),
    resolve: (member: FakeMember) => member,
  };
  readonly channels = {
    cache: new Collection<string, FakeChannel>(),
    fetch: mock(async (channelId?: string) => channelId
      ? this.channels.cache.get(channelId) ?? null
      : new Collection(this.channels.cache)),
    create: mock(async (options: ChannelOptions) => this.createChannel(options)),
  };

  constructor(readonly id: string = ids.guild) {
    const basePermissions = new PermissionsBitField([
      PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
    ]);
    for (const roleId of [id, ids.participantRole, ids.maintainerRole]) {
      this.roles.cache.set(roleId, { id: roleId, managed: false, permissions: basePermissions });
    }
    for (const userId of [ids.bot, ids.administrator, ids.maintainer, ids.owner, ids.member, ids.outsider]) {
      this.members.cache.set(userId, new FakeMember(userId, this, userId === ids.administrator || userId === ids.bot));
    }
    this.members.cache.get(ids.maintainer)!.roles.cache.set(ids.maintainerRole, this.roles.cache.get(ids.maintainerRole)!);
  }

  createChannel(options: ChannelOptions): FakeChannel {
    const channel = new FakeChannel(options);
    this.channels.cache.set(channel.id, channel);
    return channel;
  }

  asGuild(): Guild {
    return this as unknown as Guild;
  }
}

export function createServices(database: DatabaseService) {
  const repository = new JamRepository(database);
  const access = new JamAccessService(repository);
  const channels = new JamChannelService(repository);
  const operations = new JamOperationService(repository, channels, access);
  return {
    repository,
    operations,
    gameJam: new GameJamService(repository, access, channels, operations),
    teams: new TeamService(repository, access, operations, channels),
  };
}

export async function createFixture() {
  const database = new DatabaseService({
    discordToken: "test",
    discordClientId: ids.bot,
    tursoDatabaseUrl: ":memory:",
    nodeEnv: "test",
  });
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  const fakeGuild = new FakeGuild();
  const services = createServices(database);
  const guild = fakeGuild.asGuild();
  await services.gameJam.setup(guild, ids.administrator, ids.participantRole, ids.maintainerRole);
  return { database, fakeGuild, guild, ...services };
}
