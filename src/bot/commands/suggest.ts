import { stripIndents } from 'common-tags';
import {
  ColorResolvable,
  MessageEmbedOptions,
  CommandInteraction,
  Guild,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  TextChannel,
  User
} from 'discord.js';
import Command from '../lib/command';
import { findBestMatch } from 'string-similarity';

import jokes from '../../../blagues.json';

import { suggestsChannel } from '../constants';
import { interactionError } from '../utils';
import { JokeTypesRefs } from '../../typings';

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

    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${interaction.options.get('joke')!.value} ${
        interaction.options.get('response')!.value
      }`,
      jokes.map((e) => `${e.joke} ${e.answer}`)
    );

    var color: ColorResolvable = 'BLUE';
    if (bestMatch.rating > 0.6) color = 'YELLOW';
    if (bestMatch.rating > 0.75) color = 'RED';

    let description = stripIndents`
      > **Type**: ${interaction.options.get('type')!.value}
      > **Blague**: ${interaction.options.get('joke')!.value}
      > **Réponse**: ${interaction.options.get('response')!.value}
      `;
    if (color != 'BLUE') {
      description = stripIndents`**Votre blague**
        ${description}
        **[Blague similaire](https://github.com/Blagues-API/blagues-api/blob/master/blagues.json#L${
          6 * jokes[bestMatchIndex].id - 4
        }-L${6 * jokes[bestMatchIndex].id + 1})**
        >>> **Type**: ${jokes[bestMatchIndex].type}
        **Blague**: ${jokes[bestMatchIndex].joke}
        **Réponse**: ${jokes[bestMatchIndex].answer}
        `;
    }
    const embed: MessageEmbedOptions = {
      author: {
        icon_url: (interaction.member!.user as User).displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: (interaction.member!.user as User).tag
      },
      description: description,
      footer: {
        text: (interaction.guild as Guild).name,
        icon_url:
          (interaction.guild as Guild).iconURL({
            format: 'png',
            size: 32,
            dynamic: true
          }) ?? undefined
      },
      color,
      timestamp: new Date()
    };

    const row = new MessageActionRow({
      components: [
        new MessageButton({
          label: 'Envoyer',
          customId: 'true',
          style: 'SUCCESS'
        }),
        new MessageButton({
          label: 'Annuler',
          customId: 'false',
          style: 'DANGER'
        })
      ]
    });

    await interaction.reply({
      content:
        color === 'RED'
          ? 'Cette blague existe déjà.'
          : `Merci de nous avoir suggeré cette blague. Veuillez confirmer son envoi si vous êtes sûr qu'elle ne contient pas de fautes.\n\n
          ${
            color === 'YELLOW'
              ? "⚠️ Attention, une blague similaire existe déjà, êtes vous sûr qu'elle est différente ?"
              : ''
          }
        `,
      embeds: [embed],
      components: color !== 'RED' ? [row] : [],
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
