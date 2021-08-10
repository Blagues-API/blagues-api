import { stripIndents } from 'common-tags';
import {
  ColorResolvable,
  CommandInteraction,
  Guild,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  MessageEmbedOptions,
  TextChannel,
  User
} from 'discord.js';
import { findBestMatch } from 'string-similarity';
import jokes from '../../../blagues.json';
import { JokeTypesRefs } from '../../typings';
import { suggestsChannel } from '../constants';
import Command from '../lib/command';
import { interactionError } from '../utils';

enum Similarity {
  Different,
  Like,
  Same
}
enum Colors {
  YELLOW,
  BLUE,
  RED
}

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

  async run(interaction: CommandInteraction): Promise<void> {
    if (
      (interaction.options.get('joke')!.value as string).length > 130 ||
      (interaction.options.get('response')!.value as string).length > 130
    ) {
      interaction.reply(
        interactionError(
          "Chaque partie d'une blague ne peut pas dépasser les 130 caractères !"
        )
      );
      return;
    }

    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${interaction.options.get('joke')!.value} ${
        interaction.options.get('response')!.value
      }`,
      jokes.map((e) => `${e.joke} ${e.answer}`)
    );

    let similarity: Similarity = Similarity.Different;
    if (bestMatch.rating > 0.6)
      similarity = bestMatch.rating > 0.8 ? Similarity.Same : Similarity.Like;

    let description = stripIndents`
      > **Type**: ${interaction.options.get('type')!.value}
      > **Blague**: ${interaction.options.get('joke')!.value}
      > **Réponse**: ${interaction.options.get('response')!.value}
    `;

    if (similarity !== Similarity.Different) {
      description = stripIndents`
        **Votre blague**
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
      description,
      footer: {
        text: (interaction.guild as Guild).name,
        icon_url:
          (interaction.guild as Guild).iconURL({
            format: 'png',
            size: 32,
            dynamic: true
          }) ?? undefined
      },
      color: Colors[similarity] as ColorResolvable,
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
        similarity === Similarity.Same
          ? 'Cette blague existe déjà.'
          : `Merci de nous avoir suggeré cette blague. Veuillez confirmer son envoi si vous êtes sûr qu'elle ne contient pas de fautes.\n\n
          ${
            similarity === Similarity.Like
              ? "⚠️ Attention, une blague similaire existe déjà, êtes vous sûr qu'elle est différente ?"
              : ''
          }
        `,
      embeds: [embed],
      components: similarity !== Similarity.Same ? [row] : [],
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
