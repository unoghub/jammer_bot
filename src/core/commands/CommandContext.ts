import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  ModalSubmitInteraction,
  ModalBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessagePayload,
} from "discord.js";
import { CommandError } from "../errors/CommandError.ts";

export class CommandContext {
  private actor?: Promise<GuildMember>;

  constructor(public readonly interaction: ChatInputCommandInteraction | ModalSubmitInteraction) {}

  get user() { return this.interaction.user; }
  get guild() { return this.interaction.guild; }
  get member() { return this.interaction.member; }
  get isModalSubmit() { return this.interaction.isModalSubmit(); }
  get commandName() {
    return this.interaction.isModalSubmit() ? this.interaction.customId.split(":")[0]! : this.interaction.commandName;
  }
  get action() {
    return this.interaction.isModalSubmit()
      ? this.interaction.customId.split(":")[1] ?? ""
      : this.interaction.options.getSubcommand(false) ?? "";
  }
  get options() {
    if (this.interaction.isModalSubmit()) throw new CommandError("Bu etkileşim komut seçenekleri içermiyor.");
    return this.interaction.options;
  }
  get fields() {
    if (!this.interaction.isModalSubmit()) throw new CommandError("Bu etkileşim form alanları içermiyor.");
    return this.interaction.fields;
  }

  getActor(): Promise<GuildMember> {
    this.actor ??= this.requireGuild().members.fetch({ user: this.user.id, force: true });
    return this.actor;
  }

  async showModal(modal: ModalBuilder): Promise<void> {
    if (this.interaction.isModalSubmit()) throw new CommandError("Form yanıtından yeni form açılamaz.");
    await this.interaction.showModal(modal);
  }

  requireGuild(): Guild {
    if (!this.guild) {
      throw new CommandError("Bu komut yalnızca sunucuda kullanılabilir.", "GUILD_REQUIRED");
    }
    return this.guild;
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
