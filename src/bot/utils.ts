import { InteractionReplyOptions, TextChannel } from 'discord.js';
import { diffWords } from 'diff';

export function interactionError(message: string, ephemeral = true): InteractionReplyOptions {
  return {
    embeds: [
      {
        description: `❌ ${message}`,
        color: 0xff0000
      }
    ],
    ephemeral
  };
}

export function interactionInfo(message: string): InteractionReplyOptions {
  return {
    embeds: [
      {
        description: `💡 ${message}`,
        color: 0xffd983
      }
    ],
    ephemeral: true
  };
}

export function interactionValidate(message: string): InteractionReplyOptions {
  return {
    embeds: [
      {
        description: `✅ ${message}`,
        color: 0x7fef34
      }
    ],
    ephemeral: true
  };
}

export function showDiffs(oldValue: string, newValue: string): string {
  return diffWords(oldValue, newValue)
    .filter((part) => !part.removed)
    .map((part) => {
      const sep = part.added ? '__' : '';
      return `${sep}${part.value}${sep}`;
    })
    .join(' ');
}

export function isEmbedable(channel: TextChannel) {
  const permissions = channel.permissionsFor(channel.guild.me!);
  return permissions?.has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS']);
}
