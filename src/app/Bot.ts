import { Events } from "discord.js";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../config/tokens.ts";
import { EventHandler } from "../core/events/EventHandler.ts";
import { CommandDeployer } from "../infrastructure/discord/CommandDeployer.ts";
import { DatabaseService } from "../infrastructure/database/DatabaseService.ts";
import { DiscordClient } from "../infrastructure/discord/DiscordClient.ts";
import { InteractionRouter } from "../infrastructure/discord/InteractionRouter.ts";
import type { Logger } from "../infrastructure/logger/Logger.ts";

@injectable()
export class Bot {
  private started = false;
  private readonly onInteraction = (interaction: Parameters<InteractionRouter["route"]>[0]) => {
    void this.router.route(interaction).catch((err: unknown) => {
      this.logger.error("Interaction router failed", { err });
    });
  };

  constructor(
    private readonly discord: DiscordClient,
    private readonly router: InteractionRouter,
    private readonly deployer: CommandDeployer,
    private readonly events: EventHandler,
    private readonly database: DatabaseService,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.discord.client.on(Events.InteractionCreate, this.onInteraction);
    this.events.attach(this.discord.client);
    try {
      await this.database.checkConnection();
      await this.deployer.deploy();
      await this.discord.login();
      this.started = true;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.discord.client.off(Events.InteractionCreate, this.onInteraction);
    this.events.detach();
    this.discord.destroy();
    this.database.close();
    this.logger.flush();
    this.started = false;
  }
}
