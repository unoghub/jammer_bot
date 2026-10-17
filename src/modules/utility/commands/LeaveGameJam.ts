import { SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import { sql } from "drizzle-orm";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { DiscordClient } from "../../../infrastructure/discord/DiscordClient.ts";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService.ts";

@injectable()
export class LeaveGameJam extends Command {
  readonly data = new SlashCommandBuilder().setName("leavejam").setDescription("Show the Discord websocket latency");
  override readonly cooldown = 3_000;

  constructor(private readonly discord: DiscordClient,
     private readonly db: DatabaseService) { super(); }

     
   async getByUserId(userId: string)
   {

    const rows = await this.db.db.all(sql`
        SELECT *
        FROM participant
        WHERE id = ${userId}
    `);

    return rows[0] ?? null;
}
  async setByUserId(userId: string){
    const rows = await this.db.db.run(sql`
      DELETE FROM participant
         WHERE id = ${userId}
    `);
  }
  async execute(context: CommandContext): Promise<void> {

    if (!context.guild) {
            await context.reply("Bu komut yalnızca sunucuda kullanılabilir.");
            return;
        }
    const user = await this.getByUserId(context.user.id);
    if(user == null) { await context.reply(`Jam'e katılmamışsınız.`); return; }
    const rolId = '1561135085996998717';
    const member = await context.guild.members.fetch(context.user.id);
    if (member.roles.cache.has(rolId)) {
    await member.roles.remove(rolId);
}
    await this.setByUserId(context.user.id);
    await context.reply("Game Jam'den başarıyla ayrıldınız!");

  }
}