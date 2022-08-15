import {
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  Message,
  MessageComponentType,
  SelectMenuInteraction,
  User
} from 'discord.js';
import { APIEmbed } from 'discord-api-types/v10';
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

export async function paginate(
  interaction: CommandInteraction<'cached'>,
  embed: APIEmbed,
  pages: string[],
  page = 0,
  oldMessage: Message<true> | null = null
): Promise<void> {
  const message =
    oldMessage ||
    (await interaction.reply({
      embeds: [embed],
      components:
        pages.length > 1
          ? [
              {
                type: ComponentType.ActionRow,
                components: [
                  { type: ComponentType.Button, label: 'Précedent', style: ButtonStyle.Primary, customId: 'last' },
                  { type: ComponentType.Button, label: 'Suivant', style: ButtonStyle.Primary, customId: 'next' }
                ]
              }
            ]
          : [],
      fetchReply: true
    }));

  if (pages.length <= 1) return;

  try {
    const buttonInteraction = await waitForInteraction({
      component_type: ComponentType.Button,
      message: message,
      user: interaction.user
    });

    if (!buttonInteraction) return;

    switch (buttonInteraction.customId) {
      case 'last':
        page = (page > 0 ? page : pages.length) - 1;
        break;
      case 'next':
        page = page < pages.length - 1 ? page + 1 : 0;
        break;
    }

    embed.description = pages[page];
    embed.footer = { ...(embed.footer ?? {}), text: `Page ${page + 1}/${pages.length} • Blagues-API` };

    await buttonInteraction.update({ embeds: [embed] });
  } catch (error) {
    // TODO: Catch les erreurs
  }

  return paginate(interaction, embed, pages, page, message);
}
