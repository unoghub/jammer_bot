import { ModalBuilder, SlashCommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { textField, userField } from "../../../core/commands/ModalFields.ts";
import { TeamGuard } from "../guards/TeamGuard.ts";
import { TeamService } from "../services/TeamService.ts";

@injectable()
export class TeamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("team")
    .setDescription("Game Jam takım işlemleri")
    .setDMPermission(false)
    .addSubcommand((command) => command.setName("create").setDescription("Takım ve özel kanallarını oluştur"))
    .addSubcommand((command) => command.setName("add").setDescription("Takıma bir jam katılımcısı ekle"))
    .addSubcommand((command) => command.setName("disband").setDescription("Takımı dağıt ve kanallarını arşivle"))
    .addSubcommand((command) => command.setName("info").setDescription("Takımını ve kanallarını göster"));

  override readonly cooldown = 3_000;
  override readonly modalActions = ["create", "add", "disband"];
  override readonly guards;

  constructor(private readonly teams: TeamService, private readonly teamGuard: TeamGuard) {
    super();
    this.guards = [teamGuard];
  }

  async execute(context: CommandContext): Promise<void> {
    if (context.action === "info") {
      await context.defer(true);
      const team = await this.teams.findTeam(context.requireGuild().id, context.user.id);
      await context.editReply(`${team.name}: <#${team.textChannelId}> · <#${team.voiceChannelId}>`);
      return;
    }
    const creating = context.action === "create";
    const title = creating ? "Takım oluştur" : context.action === "add" ? "Takıma üye ekle" : "Takımı arşivle";
    const modal = new ModalBuilder().setCustomId(`team:${context.action}`).setTitle(title)
      .addLabelComponents(textField(
        "team", creating ? "Takım adı" : "Takım adı (boş bırakırsanız kendi takımınız)",
        { maxLength: 50, required: creating },
      ));
    if (context.action === "add") {
      modal.addLabelComponents(userField("user", "Eklenecek katılımcı"));
    }
    await context.showModal(modal);
  }

  override async executeModal(context: CommandContext): Promise<void> {
    await context.defer(true);
    const guild = context.requireGuild();
    switch (context.action) {
      case "create": {
        const team = await this.teams.create(guild, context.user.id, context.fields.getTextInputValue("team"));
        await context.editReply(`${team.name} oluşturuldu: <#${team.textChannelId}> · <#${team.voiceChannelId}>`);
        return;
      }
      case "add": {
        const user = context.fields.getSelectedUsers("user", true).first()!;
        await this.teams.addMember(guild, this.teamGuard.teamId(context), user.id);
        await context.editReply("Üye takıma eklendi ve kanal erişimi verildi.");
        return;
      }
      case "disband":
        await this.teams.disband(guild, this.teamGuard.teamId(context));
        await context.editReply("Takım dağıtıldı. Kanalları arşiv kategorisine taşındı.");
    }
  }
}
