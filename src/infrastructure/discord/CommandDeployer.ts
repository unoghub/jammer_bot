import { REST, Routes } from "discord.js";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens.ts";
import type { Config } from "../../config/Config.ts";
import { CommandRegistry } from "../../core/commands/CommandRegistry.ts";
import type { Logger } from "../logger/Logger.ts";

@injectable()
export class CommandDeployer {
  constructor(
    private readonly registry: CommandRegistry,
    @inject(TOKENS.Config) private readonly config: Config,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async deploy(): Promise<void> {
    const commands = this.registry.all().map((command) => command.data.toJSON());
    const rest = new REST({ version: "10" }).setToken(this.config.discordToken);
    const guildId = this.config.nodeEnv === "development" ? this.config.discordGuildId : undefined;
    const route = guildId
      ? Routes.applicationGuildCommands(this.config.discordClientId, guildId)
      : Routes.applicationCommands(this.config.discordClientId);
    await rest.put(route, { body: commands });
    this.logger.info("Slash commands deployed", { count: commands.length, scope: guildId ? "guild" : "global" });
  }
}
