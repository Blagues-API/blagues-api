import {
  ButtonInteraction,
  ComponentType,
  Message,
  MessageComponentType,
  StringSelectMenuInteraction,
  User
} from 'discord.js';
import { interactionInfo } from './embeds';

type WaitForInteractionOptions<T extends MessageComponentType> = {
  componentType: T;
  message: Message<true>;
  user: User;
  idle?: number;
};

type WaitForInteraction<T> = T extends WaitForInteractionOptions<ComponentType.Button>
  ? ButtonInteraction<'cached'>
  : T extends WaitForInteractionOptions<ComponentType.StringSelect>
  ? StringSelectMenuInteraction<'cached'>
  : never;

export async function waitForInteraction<T extends WaitForInteractionOptions<MessageComponentType>>(options: T) {
  return new Promise<WaitForInteraction<T> | null>((resolve, reject) => {
    const { componentType, message, user, idle = 10_000 } = options;
    message
      .createMessageComponentCollector({
        componentType,
        idle
      })
      .on('collect', async (interaction: WaitForInteraction<T>) => {
        if (interaction.user.id !== user.id) {
          await interaction.reply(interactionInfo("Vous n'êtes pas autorisé à interagir avec ce message."));
          return;
        }
        resolve(interaction);
      })
      .once('end', (_interactions, reason) => {
        if (reason === 'idle') return resolve(null);
        reject(reason);
      });
  });
}
