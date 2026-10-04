import { SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { DiscordClient } from "../../../infrastructure/discord/DiscordClient.ts";
import { DatabaseService } from "../../../infrastructure/database/DatabaseService.ts";

@injectable()
export class PingCommand extends Command {
  readonly data = new SlashCommandBuilder().setName("ping").setDescription("Show the Discord websocket latency");
  override readonly cooldown = 3_000;

  constructor(private readonly discord: DiscordClient, private readonly db: DatabaseService) { super(); }

  async execute(context: CommandContext): Promise<void> {
    await context.reply(`Pong! Websocket latency: ${Math.round(this.discord.client.ws.ping)} ms`);
  }
}
