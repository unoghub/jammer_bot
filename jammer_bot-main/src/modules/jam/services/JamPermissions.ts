import { OverwriteType, PermissionFlagsBits, type OverwriteData } from "discord.js";
import type { GameJam } from "./JamRepository.ts";

const readPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];

const writePermissions = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseVAD,
  PermissionFlagsBits.SendVoiceMessages,
  PermissionFlagsBits.SendPolls,
];

const restrictedPermissions = [
  ...writePermissions,
  PermissionFlagsBits.CreatePrivateThreads,
];

export const requiredJamBotPermissions = [
  ...readPermissions,
  ...restrictedPermissions,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.MoveMembers,
];

type PermissionOptions = {
  mode?: "active" | "archive" | "list";
  memberIds?: readonly string[];
};

export function buildJamPermissions(jam: GameJam, botId: string, options: PermissionOptions = {}): OverwriteData[] {
  const { mode = "active", memberIds = [] } = options;
  const maintainerPermissions = mode === "active" ? [...readPermissions, ...writePermissions] : readPermissions;
  const overwrites: OverwriteData[] = [
    {
      id: jam.guildId,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel, ...restrictedPermissions],
    },
    {
      id: botId,
      type: OverwriteType.Member,
      allow: [...readPermissions, ...writePermissions],
    },
    {
      id: jam.maintainerRoleId,
      type: OverwriteType.Role,
      allow: maintainerPermissions,
    },
  ];

  if (mode === "list") {
    overwrites.push({
      id: jam.participantRoleId,
      type: OverwriteType.Role,
      allow: readPermissions,
      deny: restrictedPermissions,
    });
  }

  if (mode === "active") {
    for (const userId of new Set(memberIds)) {
      if (userId === botId) continue;
      overwrites.push({
        id: userId,
        type: OverwriteType.Member,
        allow: [...readPermissions, ...writePermissions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
      });
    }
  }

  return overwrites;
}
