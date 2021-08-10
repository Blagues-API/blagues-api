import { InteractionReplyOptions } from 'discord.js';

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
