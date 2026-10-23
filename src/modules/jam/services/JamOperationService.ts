import type { Guild } from "discord.js";
import { injectable } from "tsyringe";
import { CommandError } from "../../../core/errors/CommandError.ts";
import { JamRepository, type GameJam } from "./JamRepository.ts";

@injectable()
export class JamOperationService {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly repository: JamRepository) {}

  async serialize<T>(guildId: string, action: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(guildId) ?? Promise.resolve();
    const current = previous.then(action, action);
    this.queues.set(guildId, current);

    try {
      return await current;
    } finally {
      if (this.queues.get(guildId) === current) this.queues.delete(guildId);
    }
  }

  async requireJam(guildId: string): Promise<GameJam> {
    const jam = await this.repository.getJam(guildId);
    if (!jam) {
      throw new CommandError("Önce bir yönetici /jam-setup komutunu kullanmalı.", "JAM_NOT_CONFIGURED");
    }
    return jam;
  }

  async run<T>(guild: Guild, action: (jam: GameJam) => Promise<T>): Promise<T> {
    return this.serialize(guild.id, async () => action(await this.requireJam(guild.id)));
  }
}
