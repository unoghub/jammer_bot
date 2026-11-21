import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from "discord.js";

export class AutocompleteContext {
  constructor(public readonly interaction: AutocompleteInteraction) {
    this.command = interaction.commandName;
    this.subcommandGroup = interaction.options.getSubcommandGroup(false) ?? undefined;
    this.subcommand = interaction.options.getSubcommand(false) ?? undefined;
  }

  get user() {
    return this.interaction.user;
  }
  get guild() {
    return this.interaction.guild;
  }
  get member() {
    return this.interaction.member;
  }
  get options() {
    return this.interaction.options;
  }
  get name() {
    return [this.command, this.subcommandGroup, this.subcommand].filter(Boolean).join(" ");
  }

  public command: string;
  public subcommandGroup?: string;
  public subcommand?: string;

  async respond(options: ApplicationCommandOptionChoiceData[]) {
    await this.interaction.respond(options);
  }
}
