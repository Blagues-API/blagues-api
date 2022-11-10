import {
  ButtonInteraction,
  ComponentType,
  Message,
  MessageComponentType,
  SelectMenuInteraction,
  User
} from 'discord.js';
import { interactionInfo } from './embeds';

type WaitForInteractionOptions<T extends MessageComponentType> = {
  componentType: T;
  message: Message<true>;
  user: User;
  idle?: number;
  rejectOnIdle?: boolean;
};
type WaitForInteraction<T> = T extends WaitForInteractionOptions<ComponentType.Button>
  ? ButtonInteraction<'cached'>
  : SelectMenuInteraction<'cached'>;

export async function waitForInteraction<T extends WaitForInteractionOptions<MessageComponentType>>(options: T) {
  return new Promise<WaitForInteraction<T>>((resolve, reject) => {
    const { componentType, message, user, idle = 60_000, rejectOnIdle = false } = options;
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
        if (!rejectOnIdle && reason === 'idle') return;
        reject(reason);
      });
  });
}
