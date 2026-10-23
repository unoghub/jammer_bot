import "reflect-metadata";
import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Collection, PermissionFlagsBits, type ChatInputCommandInteraction, type ModalBuilder, type ModalSubmitInteraction, type GuildMember } from "discord.js";
import { container } from "tsyringe";
import { TOKENS } from "../../src/config/tokens.ts";
import { CommandRegistry } from "../../src/core/commands/CommandRegistry.ts";
import { CommandHandler } from "../../src/core/commands/CommandHandler.ts";
import { EventRegistry } from "../../src/core/events/EventRegistry.ts";
import { DatabaseService } from "../../src/infrastructure/database/DatabaseService.ts";
import { registerJamModule } from "../../src/modules/jam/index.ts";
import { registerUtilityModule } from "../../src/modules/utility/index.ts";
import { registerModerationModule } from "../../src/modules/moderation/index.ts";
import { VerifiedRoleRemoved } from "../../src/modules/jam/events/VerifiedRoleRemoved.ts";
import { config, createFixture, ids } from "./fixtures.ts";

let fixture: Awaited<ReturnType<typeof createFixture>>;
let handler: CommandHandler;
let roleRemoved: VerifiedRoleRemoved;

class Interaction {
  deferred = false;
  replied = false;
  readonly guild;
  readonly user;
  readonly customId;
  readonly options;
  readonly fields;

  readonly reply = mock(async (_options: { content: string }) => { this.replied = true; });
  readonly editReply = mock(async (_options: unknown) => {});
  readonly followUp = mock(async (_options: unknown) => {});
  readonly deferReply = mock(async () => { this.deferred = true; });
  readonly showModal = mock(async (modal: ModalBuilder) => {
    modal.toJSON();
    this.replied = true;
  });

  constructor(
    readonly commandName: string,
    userId: string,
    readonly action = "",
    private readonly modal = false,
    values: { team?: string; userId?: string; reason?: string } = {},
  ) {
    this.guild = fixture.guild;
    this.user = { id: userId };
    this.customId = `${commandName}:${action}`;
    this.options = { getSubcommand: () => action || null };
    this.fields = {
      getTextInputValue: (key: string) => key === "team" ? values.team ?? "" : values.reason ?? "",
      getSelectedUsers: () => new Collection([[values.userId ?? ids.member, { id: values.userId ?? ids.member }]]),
    };
  }

  isChatInputCommand() { return !this.modal; }
  isModalSubmit() { return this.modal; }

  async run() {
    await handler.handle(this as unknown as ChatInputCommandInteraction | ModalSubmitInteraction);
  }
}

beforeEach(async () => {
  fixture = await createFixture();
  const app = container.createChildContainer();
  app.registerInstance(DatabaseService, fixture.database);
  app.registerInstance(TOKENS.Config, config);
  app.registerInstance(TOKENS.Logger, {
    debug: mock(() => {}), info: mock(() => {}), warn: mock(() => {}),
    error: mock(() => {}), flush: mock(() => {}),
  });
  app.registerSingleton(CommandRegistry);
  app.registerSingleton(EventRegistry);
  registerJamModule(app);
  registerUtilityModule(app);
  registerModerationModule(app);
  handler = app.resolve(CommandHandler);
  roleRemoved = app.resolve(VerifiedRoleRemoved);
});

afterEach(() => fixture.database.close());

test("Verified is required for utility commands, including administrators", async () => {
  fixture.fakeGuild.members.cache.get(ids.administrator)!.roles.cache.delete(ids.verifiedRole);
  const interaction = new Interaction("ping", ids.administrator);
  await interaction.run();
  expect(interaction.reply.mock.calls[0]?.[0].content).toContain("Verified");
});

test("setup uses the administrator guard before editing channels", async () => {
  const before = fixture.fakeGuild.channels.create.mock.calls.length;
  const interaction = new Interaction("jam-setup", ids.owner);
  await interaction.run();
  expect(interaction.reply.mock.calls[0]?.[0].content).toContain("Administrator");
  expect(fixture.fakeGuild.channels.create.mock.calls.length).toBe(before);
});

test("team input opens a valid modal and can be submitted immediately", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  const open = new Interaction("team", ids.owner, "create");
  await open.run();
  expect(open.showModal).toHaveBeenCalledTimes(1);
  expect(open.deferReply).not.toHaveBeenCalled();
  expect(open.showModal.mock.calls[0]![0].toJSON().custom_id).toBe("team:create");

  const submit = new Interaction("team", ids.owner, "create", true, { team: "Modal Team" });
  await submit.run();
  expect(submit.editReply.mock.calls[0]?.[0]).toContain("Modal Team");
  expect(await fixture.repository.memberTeam(fixture.guild.id, ids.owner)).toMatchObject({ name: "Modal Team" });
});

test("removing Verified while a form is open blocks its submission", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  const open = new Interaction("team", ids.owner, "create");
  await open.run();
  fixture.fakeGuild.members.cache.get(ids.owner)!.roles.cache.delete(ids.verifiedRole);
  const submit = new Interaction("team", ids.owner, "create", true, { team: "Rejected Team" });
  await submit.run();
  expect(submit.reply.mock.calls[0]?.[0].content).toContain("Verified");
  expect(await fixture.repository.teams(fixture.guild.id)).toHaveLength(0);
});

test("team creation rejects missing participation and blacklisted users before opening a form", async () => {
  await fixture.gameJam.join(fixture.guild, ids.member);
  await fixture.repository.blacklist(fixture.guild.id, ids.member, ids.maintainer);

  for (const [userId, message] of [[ids.owner, "joinjam"], [ids.member, "Kara liste"]] as const) {
    const interaction = new Interaction("team", userId, "create");
    await interaction.run();
    expect(interaction.showModal).not.toHaveBeenCalled();
    expect(interaction.reply.mock.calls[0]?.[0].content).toContain(message);
  }
  expect(await fixture.repository.teams(fixture.guild.id)).toHaveLength(0);
});

test("removing the participant role while a form is open blocks team creation", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  const open = new Interaction("team", ids.owner, "create");
  await open.run();
  expect(open.showModal).toHaveBeenCalledTimes(1);

  fixture.fakeGuild.members.cache.get(ids.owner)!.roles.cache.delete(ids.participantRole);
  const submit = new Interaction("team", ids.owner, "create", true, { team: "No Longer Eligible" });
  await submit.run();
  expect(submit.reply.mock.calls[0]?.[0].content).toContain("joinjam");
  expect(await fixture.repository.teams(fixture.guild.id)).toHaveLength(0);
});

test("maintainer permissions are rechecked on modal submission", async () => {
  const open = new Interaction("jam", ids.maintainer, "blacklist");
  await open.run();
  expect(open.showModal).toHaveBeenCalledTimes(1);
  fixture.fakeGuild.members.cache.get(ids.maintainer)!.roles.cache.delete(ids.maintainerRole);
  const submit = new Interaction("jam", ids.maintainer, "blacklist", true);
  await submit.run();
  expect(submit.reply.mock.calls[0]?.[0].content).toContain("Maintainer");
  expect(await fixture.repository.isBlacklisted(fixture.guild.id, ids.member)).toBe(false);
});

test("an owner cannot submit a form for another team; a maintainer can", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  await fixture.gameJam.join(fixture.guild, ids.member);
  const ownTeam = await fixture.teams.create(fixture.guild, ids.owner, "Owner Team");
  const otherTeam = await fixture.teams.create(fixture.guild, ids.member, "Other Team");
  const rejected = new Interaction("team", ids.owner, "disband", true, { team: otherTeam.name });
  await rejected.run();
  expect(rejected.reply.mock.calls[0]?.[0].content).toContain("Takım sahibi");
  expect((await fixture.repository.getTeam(fixture.guild.id, otherTeam.id))?.status).toBe("active");
  const accepted = new Interaction("team", ids.maintainer, "disband", true, { team: otherTeam.name });
  await accepted.run();
  expect((await fixture.repository.getTeam(fixture.guild.id, otherTeam.id))?.status).toBe("archived");
  expect((await fixture.repository.getTeam(fixture.guild.id, ownTeam.id))?.status).toBe("active");
});

test("joinjam followed by team add works through the command runner", async () => {
  await new Interaction("joinjam", ids.owner).run();
  await new Interaction("joinjam", ids.member).run();
  await fixture.teams.create(fixture.guild, ids.owner, "Join Then Add");
  const open = new Interaction("team", ids.owner, "add");
  await open.run();
  expect(open.showModal).toHaveBeenCalledTimes(1);
  const submit = new Interaction("team", ids.owner, "add", true, { userId: ids.member });
  await submit.run();
  expect(submit.editReply.mock.calls[0]?.[0]).toContain("Üye takıma eklendi");
  expect((await fixture.repository.memberTeam(fixture.guild.id, ids.member))?.name).toBe("Join Then Add");
});

test("unknown modal actions are rejected without changing data", async () => {
  const submit = new Interaction("team", ids.owner, "create:extra", true, { team: "Unexpected" });
  await submit.run();
  expect(submit.reply.mock.calls[0]?.[0].content).toContain("desteklenmiyor");
  expect(await fixture.repository.teams(fixture.guild.id)).toHaveLength(0);
});

test("ban uses a valid modal and rechecks administrator permissions", async () => {
  const open = new Interaction("ban", ids.administrator);
  await open.run();
  expect(open.showModal).toHaveBeenCalledTimes(1);
  fixture.fakeGuild.members.cache.get(ids.administrator)!.permissions.remove(PermissionFlagsBits.Administrator);
  const submit = new Interaction("ban", ids.administrator, "confirm", true);
  await submit.run();
  expect(submit.reply.mock.calls[0]?.[0].content).toContain("Administrator");
});

test("Verified removal runs the same leave flow without changing team ownership", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  const team = await fixture.teams.create(fixture.guild, ids.owner, "Existing Team");
  const member = fixture.fakeGuild.members.cache.get(ids.owner)!;
  const previous = { ...member, roles: { cache: new Collection(member.roles.cache) } } as unknown as GuildMember;
  member.roles.cache.delete(ids.verifiedRole);
  const updated = Object.assign(member, { guild: fixture.guild }) as unknown as GuildMember;
  await roleRemoved.execute(previous, updated);
  expect(member.roles.cache.has(ids.participantRole)).toBe(false);
  expect(await fixture.repository.isParticipant(fixture.guild.id, ids.owner)).toBe(false);
  expect(await fixture.repository.memberTeam(fixture.guild.id, ids.owner)).toMatchObject({ id: team.id, ownerId: ids.owner });
});

test("unrelated member updates leave participation unchanged", async () => {
  await fixture.gameJam.join(fixture.guild, ids.owner);
  const member = Object.assign(fixture.fakeGuild.members.cache.get(ids.owner)!, { guild: fixture.guild }) as unknown as GuildMember;
  await roleRemoved.execute(member, member);
  expect(await fixture.repository.isParticipant(fixture.guild.id, ids.owner)).toBe(true);
});
