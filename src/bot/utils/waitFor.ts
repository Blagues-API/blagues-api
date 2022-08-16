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
  component_type: T;
  message: Message<true>;
  user: User;
  idle?: number;
};
type WaitForInteraction<T> = T extends WaitForInteractionOptions<ComponentType.Button>
  ? ButtonInteraction<'cached'>
  : SelectMenuInteraction<'cached'>;

export async function waitForInteraction<T extends WaitForInteractionOptions<MessageComponentType>>(options: T) {
  return new Promise<WaitForInteraction<T>>((resolve, reject) => {
    const { component_type, message, user, idle = 60_000 } = options;
    message
      .createMessageComponentCollector({
        componentType: component_type,
        idle: idle
      })
      .on('collect', async (interaction: WaitForInteraction<T>) => {
        if (interaction.user.id !== user.id) {
          await interaction.reply(interactionInfo("Vous n'êtes pas autorisé à interagir avec ce message."));
          return;
        }
        resolve(interaction);
      })
      .once('end', (_interactions, reason) => {
        if (reason !== 'idle') reject(reason);
      });
  });
}
