
import { SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import { sql } from "drizzle-orm";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService.ts";

@injectable()
export class JoinGameJam extends Command {
    readonly data = new SlashCommandBuilder()
        .setName("joinjam")
        .setDescription("Join the Game Jam");

    override readonly cooldown = 3_000;

    constructor(
        private readonly database: DatabaseService
    ) {
        super();
    }

    async getByUserId(
        userId: string,
        table: "blacklist" | "participant"
    ) {
        const tableSql =
            table === "blacklist"
                ? sql`blacklist`
                : sql`participant`;

        const rows = await this.database.db.all(sql`
            SELECT *
            FROM ${tableSql}
            WHERE id = ${userId}
            LIMIT 1
        `);

        return rows[0] ?? null;
    }

    async setByUserId(userId: string): Promise<void> {
        await this.database.db.run(sql`
            INSERT INTO participant (id)
            VALUES (${userId})
        `);
    }

    async execute(context: CommandContext): Promise<void> {
        if (!context.guild) {
            await context.reply("Bu komut yalnızca sunucuda kullanılabilir.");
            return;
        }

        const userId = context.user.id;
        const rolId = "1561135085996998717";

        try {
            const blacklist = await this.getByUserId(userId, "blacklist");

            if (blacklist !== null) {
                await context.reply("Blacklist tablosundasınız.");
                return;
            }

            const participant = await this.getByUserId(userId, "participant");

            if (participant !== null) {
                await context.reply("Zaten Jam'e katılmışsınız.");
                return;
            }

            const member = await context.guild.members.fetch(userId);
            const hadRole = member.roles.cache.has(rolId);

            if (!hadRole) {
                await member.roles.add(rolId);
            }

            try {
                await this.setByUserId(userId);
            } catch (dbError) {
                if (!hadRole) {
                    try {
                        await member.roles.remove(rolId);
                    } catch (rollbackError) {
                        console.error("Rol geri alınamadı:", rollbackError);
                    }
                }
                throw dbError;
            }

            await context.reply("Game Jam'e başarıyla katıldınız!");

        } catch (error) {
            console.error("JoinGameJam hatası:", error);
            await context.reply("Katılım sırasında bir hata oluştu.");
        }
    }
}
