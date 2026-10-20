import { inject, injectable } from "tsyringe";
import { Event } from "../../core/events/Event";
import type { Message } from "discord.js";
import { TOKENS } from "../../config/tokens";
import type { Logger } from "../../infrastructure/logger/Logger";

@injectable()
export class MessageEvent extends Event<"messageCreate"> {
    readonly name = "messageCreate";
    
    constructor(@inject(TOKENS.Logger) private readonly logger: Logger) { super(); }

    async execute(message: Message<true>): Promise<void> {
        this.logger.info(`some message from ${message.author.globalName}`)
    }
}