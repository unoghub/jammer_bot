import type { ChatInputCommandInteraction, InteractionEditReplyOptions, InteractionReplyOptions, MessagePayload } from "discord.js";
import type { CommandHandler } from "./CommandHandler";

export class CommandContext {
  constructor(
    public readonly interaction: ChatInputCommandInteraction,
    readonly handler: CommandHandler,
  ) {
    this.command = interaction.commandName;
  }
  private command: string;
  public subcommandGroup?: string;
  public subcommand?: string;

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

  async reply(options: string | MessagePayload | InteractionReplyOptions): Promise<void> {
    await this.interaction.reply(options);
  }

  async defer(ephemeral = false): Promise<void> {
    await this.interaction.deferReply({ ephemeral });
  }

  async editReply(options: string | MessagePayload | InteractionEditReplyOptions): Promise<void> {
    await this.interaction.editReply(options);
  }

  async followUp(options: string | MessagePayload | InteractionReplyOptions): Promise<void> {
    await this.interaction.followUp(options);
  }
}
