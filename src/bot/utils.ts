import { InteractionReplyOptions, TextChannel, MessageOptions } from 'discord.js';
import { diffWords } from 'diff';

export function interactionProblem(message: string, ephemeral = true): InteractionReplyOptions {
  return {
    ...problem(message),
    ephemeral
  };
}

export function problem(message: string): MessageOptions {
  return {
    embeds: [
      {
        description: `❌ ${message}`,
        color: 0xff0000
      }
    ]
  };
}

export function interactionInfo(message: string): InteractionReplyOptions {
  return {
    ...info(message),
    ephemeral: true
  };
}

export function info(message: string): MessageOptions {
  return {
    embeds: [
      {
        description: `💡 ${message}`,
        color: 0xffd983
      }
    ]
  };
}

export function interactionValidate(message: string): InteractionReplyOptions {
  return {
    ...validate(message),
    ephemeral: true
  };
}

export function validate(message: string): MessageOptions {
  return {
    embeds: [
      {
        description: `✅ ${message}`,
        color: 0x7fef34
      }
    ]
  };
}

export function showDiffs(oldValue: string, newValue: string): string {
  return diffWords(oldValue, newValue)
    .filter((part) => !part.removed)
    .map((part) => {
      const sep = part.added ? '`' : '';
      return `${sep}${part.value}${sep}`;
    })
    .join('');
}

export function isEmbedable(channel: TextChannel) {
  const permissions = channel.permissionsFor(channel.guild.me!);
  return permissions?.has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS']);
}
