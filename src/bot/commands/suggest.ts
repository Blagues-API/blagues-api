import { stripIndents } from 'common-tags';
import {
  CommandInteraction,
  Guild,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  TextChannel,
  User
} from 'discord.js';
import Command from '../lib/command';

import { suggestsChannel } from '../constants';
import { interactionError } from '../utils';
import { JokeTypesRefs } from '../../typings';
import { MessageButtonStyles } from 'discord.js/typings/enums';

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'suggest',
      description: 'Proposer une blague',
      options: [
        {
          type: 'STRING',
          name: 'type',
          description: 'Général, Développeur, Noir, +18, Beauf, Blondes',
          required: true,
          choices: Object.entries(JokeTypesRefs).map(([key, name]) => ({
            name,
            value: key
          }))
        },
        {
          type: 'STRING',
          name: 'joke',
          description: 'Contenue de la blague',
          required: true
        },
        {
          type: 'STRING',
          name: 'response',
          description: 'Réponse de la blague',
          required: true
        }
      ]
    });
  }

  async run(interaction: CommandInteraction) {
    if (
      (interaction.options.get('joke')!.value as string).length > 130 ||
      (interaction.options.get('response')!.value as string).length > 130
    ) {
      return interactionError(
        interaction,
        "Chaque partie d'une blague ne peut pas dépasser les 130 caractères !"
      );
    }

    const embed = {
      author: {
        icon_url: (interaction.member!.user as User).displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: (interaction.member!.user as User).tag
      },
      description: stripIndents`
        >>> **Type**: ${interaction.options.get('type')!.value}
        **Blague**: ${interaction.options.get('joke')!.value}
        **Réponse**: ${interaction.options.get('response')!.value}
      `,
      footer: {
        text: (interaction.guild as Guild).name,
        icon_url:
          (interaction.guild as Guild).iconURL({
            format: 'png',
            size: 32,
            dynamic: true
          }) ?? undefined
      },
      color: 0x0067ad,
      timestamp: new Date()
    };

    const row = new MessageActionRow({
      components: [
        new MessageButton({
          label: 'Envoyer',
          customId: 'true',
          style: MessageButtonStyles.SUCCESS
        }),
        new MessageButton({
          label: 'Annuler',
          customId: 'false',
          style: MessageButtonStyles.DANGER
        })
      ]
    });

    await interaction.reply({
      content:
        "Merci de nous avoir suggeré cette blague. Veuillez confirmer son envoi si vous êtes sûr qu'elle ne contient pas de faute.",
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    const confirmation = await interaction
      .channel!.awaitMessageComponent({
        filter: (i: MessageComponentInteraction) =>
          i.user.id === interaction.user.id,
        time: 30000
      })
      .catch(() => null);

    switch (confirmation?.customId) {
      case 'true': {
        const channel: TextChannel = interaction.guild!.channels.cache.get(
          suggestsChannel
        ) as TextChannel;

        await channel.send({ embeds: [embed] });

        /**
         * TODO: Ajouter les réactions
         */

        return confirmation.update({
          content: 'La blague à été envoyée',
          components: [],
          embeds: []
        });
      }
      case 'false': {
        return confirmation.update({
          content: "La blague n'a pas été envoyé",
          components: [],
          embeds: [embed]
        });
      }
      default:
        return;
    }
  }
}
