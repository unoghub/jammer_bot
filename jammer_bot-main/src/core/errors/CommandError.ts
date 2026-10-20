import { BotError } from "./BotError.ts";

export class CommandError extends BotError {
  constructor(message: string, code = "COMMAND_ERROR", options?: ErrorOptions) {
    super(message, code, message, options);
    this.name = "CommandError";
  }
}
