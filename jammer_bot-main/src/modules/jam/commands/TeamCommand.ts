import { SlashCommandBuilder, type SlashCommandSubcommandBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../../../core/commands/Command.ts";
import type { CommandContext } from "../../../core/commands/CommandContext.ts";
import { TeamService } from "../services/TeamService.ts";

function withTeamOption(command: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return command.addStringOption((option) => option
    .setName("team")
    .setDescription("Takım adı; boş bırakırsanız kendi takımınız")
    .setMaxLength(50));
}

@injectable()
export class TeamCommand extends Command {
  readonly data = new SlashCommandBuilder()
    .setName("team")
    .setDescription("Game Jam takım işlemleri")
    .setDMPermission(false)
    .addSubcommand((command) => command
      .setName("create")
      .setDescription("Takım ve özel kanallarını oluştur")
      .addStringOption((option) => option
        .setName("name")
        .setDescription("Takım adı")
        .setMinLength(1)
        .setMaxLength(50)
        .setRequired(true)))
    .addSubcommand((command) => withTeamOption(command
      .setName("add")
      .setDescription("Takıma bir jam katılımcısı ekle")
      .addUserOption((option) => option.setName("user").setDescription("Eklenecek katılımcı").setRequired(true))))
    .addSubcommand((command) => withTeamOption(command
      .setName("disband")
      .setDescription("Takımı dağıt ve kanallarını arşivle")))
    .addSubcommand((command) => command.setName("info").setDescription("Takımını ve kanallarını göster"));

  override readonly cooldown = 3_000;

  constructor(private readonly teams: TeamService) {
    super();
  }

  async execute(context: CommandContext): Promise<void> {
    const guild = context.requireGuild();
    const actorId = context.user.id;
    const action = context.options.getSubcommand();
    await context.defer(true);

    switch (action) {
      case "create": {
        const team = await this.teams.create(guild, actorId, context.options.getString("name", true));
        await context.editReply(`${team.name} oluşturuldu: <#${team.textChannelId}> · <#${team.voiceChannelId}>`);
        return;
      }
      case "add":
        await this.teams.addMember(
          guild, actorId, context.options.getUser("user", true).id,
          context.options.getString("team") ?? undefined,
        );
        await context.editReply("Üye takıma eklendi ve kanal erişimi verildi.");
        return;
      case "disband":
        await this.teams.disband(guild, actorId, context.options.getString("team") ?? undefined);
        await context.editReply("Takım dağıtıldı. Kanalları Game Jam Archives kategorisine taşındı.");
        return;
      case "info": {
        const team = await this.teams.getMemberTeam(guild, actorId);
        await context.editReply(`${team.name}: <#${team.textChannelId}> · <#${team.voiceChannelId}>`);
        return;
      }
    }
  }
}
