import { and, asc, eq } from "drizzle-orm";
import { injectable } from "tsyringe";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService.ts";
import { gameJams, jamBlacklist, jamParticipants, jamTeamMembers, jamTeams } from "../../../infrastructure/database/schema.ts";

export type GameJam = typeof gameJams.$inferSelect;
export type JamTeam = typeof jamTeams.$inferSelect;

@injectable()
export class JamRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db; }

  async getJam(guildId: string) {
    return this.db.query.gameJams.findFirst({ where: eq(gameJams.guildId, guildId) });
  }

  async createJam(guildId: string, participantRoleId: string, maintainerRoleId: string) {
    await this.db.insert(gameJams).values({ guildId, participantRoleId, maintainerRoleId });
  }

  async updateJam(guildId: string, values: Partial<typeof gameJams.$inferInsert>) {
    await this.db.update(gameJams).set(values).where(eq(gameJams.guildId, guildId));
  }

  async isBlacklisted(guildId: string, userId: string) {
    return Boolean(await this.db.query.jamBlacklist.findFirst({
      where: and(eq(jamBlacklist.guildId, guildId), eq(jamBlacklist.userId, userId)),
    }));
  }

  async blacklist(guildId: string, userId: string, addedBy: string) {
    await this.db.transaction(async (tx) => {
      await tx.insert(jamBlacklist).values({ guildId, userId, addedBy }).onConflictDoNothing();
      await tx.insert(jamParticipants).values({ guildId, userId, active: false })
        .onConflictDoUpdate({
          target: [jamParticipants.guildId, jamParticipants.userId],
          set: { active: false, needsSync: true },
        });
    });
  }

  async unblacklist(guildId: string, userId: string) {
    await this.db.delete(jamBlacklist).where(and(eq(jamBlacklist.guildId, guildId), eq(jamBlacklist.userId, userId)));
  }

  async isParticipant(guildId: string, userId: string) {
    return Boolean(await this.db.query.jamParticipants.findFirst({
      where: and(eq(jamParticipants.guildId, guildId), eq(jamParticipants.userId, userId), eq(jamParticipants.active, true)),
    }));
  }

  async setParticipant(guildId: string, userId: string, active: boolean) {
    await this.db.insert(jamParticipants).values({ guildId, userId, active })
      .onConflictDoUpdate({ target: [jamParticipants.guildId, jamParticipants.userId], set: { active, needsSync: true } });
  }

  async pendingParticipants(guildId: string) {
    return this.db.select().from(jamParticipants)
      .where(and(eq(jamParticipants.guildId, guildId), eq(jamParticipants.needsSync, true)));
  }

  async participantSynced(guildId: string, userId: string) {
    await this.db.update(jamParticipants).set({ needsSync: false })
      .where(and(eq(jamParticipants.guildId, guildId), eq(jamParticipants.userId, userId)));
  }

  async teams(guildId: string) {
    return this.db.select().from(jamTeams).where(eq(jamTeams.guildId, guildId)).orderBy(asc(jamTeams.name));
  }

  async getTeam(guildId: string, teamId: string) {
    return this.db.query.jamTeams.findFirst({ where: and(eq(jamTeams.guildId, guildId), eq(jamTeams.id, teamId)) });
  }

  async memberTeam(guildId: string, userId: string) {
    const membership = await this.db.query.jamTeamMembers.findFirst({
      where: and(eq(jamTeamMembers.guildId, guildId), eq(jamTeamMembers.userId, userId)),
    });
    return membership ? this.getTeam(guildId, membership.teamId) : undefined;
  }

  async members(teamId: string) {
    return this.db.select().from(jamTeamMembers).where(eq(jamTeamMembers.teamId, teamId))
      .orderBy(asc(jamTeamMembers.joinedAt), asc(jamTeamMembers.userId));
  }

  async createTeam(guildId: string, ownerId: string, name: string) {
    const id = crypto.randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(jamTeams).values({ id, guildId, ownerId, name, activeName: name.toLocaleLowerCase("en"), archivedMemberIds: [] });
      await tx.insert(jamTeamMembers).values({ guildId, userId: ownerId, teamId: id });
      await tx.update(gameJams).set({ listNeedsSync: true }).where(eq(gameJams.guildId, guildId));
    });
    return id;
  }

  async updateTeam(teamId: string, values: Partial<typeof jamTeams.$inferInsert>) {
    await this.db.update(jamTeams).set(values).where(eq(jamTeams.id, teamId));
  }

  async addMember(team: JamTeam, userId: string) {
    await this.db.transaction(async (tx) => {
      await tx.insert(jamTeamMembers).values({ guildId: team.guildId, teamId: team.id, userId });
      await tx.update(jamTeams).set({ needsSync: true }).where(eq(jamTeams.id, team.id));
    });
  }

  async beginArchive(team: JamTeam) {
    await this.db.transaction(async (tx) => {
      await tx.update(jamTeams).set({ status: "archiving", needsSync: true }).where(eq(jamTeams.id, team.id));
      await tx.update(gameJams).set({ listNeedsSync: true }).where(eq(gameJams.guildId, team.guildId));
    });
  }

  async finishArchive(team: JamTeam, memberIds: string[]) {
    await this.db.transaction(async (tx) => {
      await tx.update(jamTeams).set({
        status: "archived", activeName: null, archivedAt: new Date(), archivedMemberIds: memberIds, needsSync: false,
      }).where(eq(jamTeams.id, team.id));
      await tx.delete(jamTeamMembers).where(eq(jamTeamMembers.teamId, team.id));
    });
  }

  async markAllForSync(guildId: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(jamTeams).set({ needsSync: true }).where(eq(jamTeams.guildId, guildId));
      await tx.update(jamParticipants).set({ needsSync: true }).where(eq(jamParticipants.guildId, guildId));
      await tx.update(gameJams).set({ listNeedsSync: true }).where(eq(gameJams.guildId, guildId));
    });
  }
}
