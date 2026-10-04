import { Client, GatewayIntentBits } from "discord.js";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens.ts";
import type { Config } from "../../config/Config.ts";

@injectable()
export class DiscordClient {
  readonly client = new Client({ intents: [GatewayIntentBits.Guilds] });

  constructor(@inject(TOKENS.Config) private readonly config: Config) {}

  async login(): Promise<void> { await this.client.login(this.config.discordToken); }
  destroy(): void { this.client.destroy(); }
  isReady(): boolean { return this.client.isReady(); }
}
