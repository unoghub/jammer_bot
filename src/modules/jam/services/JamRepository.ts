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
    const [jam] = await this.db.insert(gameJams).values({ guildId, participantRoleId, maintainerRoleId }).returning();
    return jam!;
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
    await this.db.insert(jamBlacklist).values({ guildId, userId, addedBy }).onConflictDoNothing();
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
      .onConflictDoUpdate({ target: [jamParticipants.guildId, jamParticipants.userId], set: { active } });
  }

  async teams(guildId: string) {
    return this.db.select().from(jamTeams).where(eq(jamTeams.guildId, guildId)).orderBy(asc(jamTeams.name));
  }

  async getTeam(guildId: string, teamId: string) {
    return this.db.query.jamTeams.findFirst({ where: and(eq(jamTeams.guildId, guildId), eq(jamTeams.id, teamId)) });
  }

  async findTeam(guildId: string, name: string) {
    return this.db.query.jamTeams.findFirst({
      where: and(eq(jamTeams.guildId, guildId), eq(jamTeams.activeName, this.teamNameKey(name))),
    });
  }

  async memberTeam(guildId: string, userId: string) {
    const [membership] = await this.db.select({ team: jamTeams }).from(jamTeamMembers)
      .innerJoin(jamTeams, eq(jamTeams.id, jamTeamMembers.teamId))
      .where(and(
        eq(jamTeamMembers.guildId, guildId),
        eq(jamTeams.guildId, guildId),
        eq(jamTeamMembers.userId, userId),
      ))
      .limit(1);
    return membership?.team;
  }

  async memberIds(teamId: string): Promise<string[]> {
    const members = await this.db.select({ userId: jamTeamMembers.userId }).from(jamTeamMembers)
      .where(eq(jamTeamMembers.teamId, teamId))
      .orderBy(asc(jamTeamMembers.joinedAt), asc(jamTeamMembers.userId));
    return members.map((member) => member.userId);
  }

  async createTeam(guildId: string, ownerId: string, name: string) {
    return this.db.transaction(async (tx) => {
      const [team] = await tx.insert(jamTeams).values({
        id: crypto.randomUUID(), guildId, ownerId, name,
        activeName: this.teamNameKey(name), archivedMemberIds: [],
      }).returning();
      await tx.insert(jamTeamMembers).values({ guildId, userId: ownerId, teamId: team!.id });
      return team!;
    });
  }

  async updateTeam(teamId: string, values: Partial<typeof jamTeams.$inferInsert>) {
    const [team] = await this.db.update(jamTeams).set(values).where(eq(jamTeams.id, teamId)).returning();
    return team!;
  }

  async addMember(team: JamTeam, userId: string) {
    await this.db.insert(jamTeamMembers).values({ guildId: team.guildId, teamId: team.id, userId }).onConflictDoNothing();
  }

  async finishArchive(team: JamTeam, memberIds: string[]) {
    return this.db.transaction(async (tx) => {
      const [archived] = await tx.update(jamTeams).set({
        status: "archived", activeName: null, archivedAt: new Date(), archivedMemberIds: memberIds,
      }).where(eq(jamTeams.id, team.id)).returning();
      await tx.delete(jamTeamMembers).where(eq(jamTeamMembers.teamId, team.id));
      return archived!;
    });
  }

  private teamNameKey(name: string): string {
    return name.normalize("NFKC").trim().toLocaleLowerCase("en");
  }
}
