import type { SubcommandGroup } from "./SubcommandGroup";

export class SubcommandGroupRegistry {
  private readonly commands = new Map<string, SubcommandGroup>();

  register(subcommand: SubcommandGroup) {
    const name = subcommand.data.name;
    if (this.commands.has(name))
      throw new Error(`Duplicate subcommand group registration: ${name}`);
    this.commands.set(name, subcommand);
  }

  get(name: string): SubcommandGroup | undefined {
    return this.commands.get(name);
  }
  all(): readonly SubcommandGroup[] {
    return [...this.commands.values()];
  }
}
