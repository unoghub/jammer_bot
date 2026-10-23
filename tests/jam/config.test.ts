import { expect, test } from "bun:test";
import { loadConfig } from "../../src/config/Config.ts";
import { ids } from "./fixtures.ts";

const env = {
  DISCORD_TOKEN: "test",
  DISCORD_CLIENT_ID: ids.bot,
  DISCORD_GUILD_ID: "",
  NODE_ENV: "test",
  TURSO_DATABASE_URL: ":memory:",
  TURSO_AUTH_TOKEN: "",
  VERIFIED_ROLE_ID: ids.verifiedRole,
  JAM_PARTICIPANT_ROLE_ID: ids.participantRole,
  JAM_MAINTAINER_ROLE_ID: ids.maintainerRole,
  JAM_CATEGORY_NAME: "Custom Jam",
  JAM_ARCHIVE_CATEGORY_NAME: "Custom Archive",
  JAM_TEAM_LIST_CHANNEL_NAME: "custom-teams",
  JAM_CATEGORY_ID: "",
  JAM_ARCHIVE_CATEGORY_ID: "",
  JAM_TEAM_LIST_CHANNEL_ID: "",
  JAM_MAX_TEAM_MEMBERS: "12",
};

test("configuration reads channel names and accepts blank optional IDs", () => {
  expect(loadConfig(env)).toMatchObject({
    jamCategoryName: "Custom Jam",
    jamArchiveCategoryName: "Custom Archive",
    jamTeamListChannelName: "custom-teams",
    jamMaxTeamMembers: 12,
    jamCategoryId: undefined,
    tursoAuthToken: undefined,
  });
});

test("an unknown Verified role fails configuration rather than bypassing verification", () => {
  expect(() => loadConfig({ ...env, VERIFIED_ROLE_ID: "" })).toThrow("VERIFIED_ROLE_ID");
});

test("shared roles and archive destinations must be different", () => {
  expect(() => loadConfig({ ...env, VERIFIED_ROLE_ID: ids.participantRole })).toThrow("must be different");
  expect(() => loadConfig({ ...env, JAM_ARCHIVE_CATEGORY_NAME: env.JAM_CATEGORY_NAME })).toThrow("must be different");
  expect(() => loadConfig({ ...env, JAM_CATEGORY_ID: ids.guild, JAM_ARCHIVE_CATEGORY_ID: ids.guild })).toThrow("must be different");
});

test("team capacity cannot exceed the Discord overwrite limit", () => {
  expect(() => loadConfig({ ...env, JAM_MAX_TEAM_MEMBERS: "98" })).toThrow("JAM_MAX_TEAM_MEMBERS");
});
