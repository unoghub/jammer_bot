import { injectable } from "tsyringe";
import type { Command } from "./Command.ts";

@injectable()
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    const name = command.data.name;
    if (this.commands.has(name)) throw new Error(`Duplicate command registration: ${name}`);
    this.commands.set(name, command);
  }

  get(name: string): Command | undefined { return this.commands.get(name); }
  has(name: string): boolean { return this.commands.has(name); }
  all(): readonly Command[] { return [...this.commands.values()]; }
}
