import type { Subcommand } from "./Subcommand";

export class SubcommandRegistry {
  private readonly commands = new Map<string, Subcommand>();

  register(subcommand: Subcommand) {
    const name = subcommand.data.name;
    if (this.commands.has(name))
      throw new Error(`Duplicate subcommand registration: ${name}`);
    this.commands.set(name, subcommand);
  }

  get(name: string): Subcommand | undefined {
    return this.commands.get(name);
  }
  all(): readonly Subcommand[] {
    return [...this.commands.values()];
  }
}
