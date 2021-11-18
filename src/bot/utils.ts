import { InteractionReplyOptions } from 'discord.js';
import { diffWords } from 'diff';

export function interactionError(message: string): InteractionReplyOptions {
  return {
    embeds: [
      {
        description: `❌ ${message}`,
        color: 0xff0000
      }
    ],
    ephemeral: true
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
    .map((part) => {
      const sep = part.added ? '__' : part.removed ? '~~' : '';
      return `${sep}${part.value}${sep}`;
    })
    .join(' ');
}
