import type {
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessagePayload,
} from "discord.js";
import type { AnyGuard, GuardClass, GuardData } from "../guards/Guard";

export class CommandContext {
  constructor(public readonly interaction: ChatInputCommandInteraction) {
    this.command = interaction.commandName;
    this.subcommandGroup = interaction.options.getSubcommandGroup(false) ?? undefined;
    this.subcommand = interaction.options.getSubcommand(false) ?? undefined;
  }
  public command: string;
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

  private readonly guardData = new Map<GuardClass, unknown>();

  _setGuardData(guard: AnyGuard, data: unknown) {
    this.guardData.set(guard.constructor as GuardClass, data);
  }

  get<G extends AnyGuard>(guard: GuardClass<G>): GuardData<G> {
    if (!this.guardData.has(guard)) {
      throw new Error(`No data for ${guard.name}. Is it even in this command's guards?`);
    }
    return this.guardData.get(guard) as GuardData<G>;
  }
}
