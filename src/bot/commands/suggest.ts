import { stripIndents } from 'common-tags';
import { CommandInteraction, Guild, TextChannel, User } from 'discord.js';
import { suggestsChannel } from '../constants';
import { interactionError } from '../utils';

export default async (interaction: CommandInteraction) => {
  if (
    (interaction.options.get('joke')!.value as string).length > 130 ||
    (interaction.options.get('response')!.value as string).length > 130
  )
    return interactionError(
      interaction,
      "Chaque partie d'une blague ne peut pas excéder 130 caractères !"
    );

  const channel: TextChannel = interaction.guild!.channels.cache.get(
    suggestsChannel
  ) as TextChannel;

  channel.send({
    embeds: [
      {
        author: {
          icon_url: (interaction.member!.user as User).displayAvatarURL({
            format: 'png',
            size: 32,
            dynamic: true
          }),
          name: (interaction.member!.user as User).tag,
        },
        description: stripIndents`
        >>> **Type**: ${interaction.options.get('type')!.value}
        **Blague**: ${interaction.options.get('joke')!.value}
        **Réponse**: ${interaction.options.get('response')!.value}
        `,
        footer: {
          text: (interaction.guild as Guild).name,
          icon_url: (interaction.guild as Guild).iconURL({
            format: 'png',
            size: 32,
            dynamic: true
          }) ?? undefined
        },
        timestamp: Date.now(),
      }
    ]
  });
};
