import { stripIndents } from 'common-tags';
import {
  ButtonInteraction,
  ColorResolvable,
  CommandInteraction,
  Message,
  MessageOptions,
  MessageButton,
  MessageComponentInteraction,
  MessageEmbedOptions,
  TextChannel
} from 'discord.js';
import { findBestMatch } from 'string-similarity';
import jokes from '../../../blagues.json';
import { Category, CategoriesRefs, UnsignedJoke } from '../../typings';
import {
  downReaction,
  neededApprovals,
  suggestsChannel,
  upReaction
} from '../constants';
import Command from '../lib/command';
import { interactionError } from '../utils';
import Collection from '@discordjs/collection';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';

enum Similarity {
  Different,
  Like,
  Same
}
enum Colors {
  BLUE,
  YELLOW,
  RED
}

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'suggestion',
      description: 'Proposer une blague',
      type: 'CHAT_INPUT',
      options: [
        {
          type: 'STRING',
          name: 'type',
          description: 'Général, Développeur, Noir, +18, Beauf, Blondes',
          required: true,
          choices: Object.entries(CategoriesRefs).map(([key, name]) => ({
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

    // TODO: Compare with saved updates

    const similarity =
      bestMatch.rating > 0.6
        ? bestMatch.rating > 0.8
          ? Similarity.Same
          : Similarity.Like
        : Similarity.Different;

    const payload = {
      type: interaction.options.get('type')!.value as Category,
      joke: interaction.options.get('joke')!.value,
      answer: interaction.options.get('response')!.value
    } as UnsignedJoke;

    let description = stripIndents`
      > **Type**: ${CategoriesRefs[payload.type]}
      > **Blague**: ${payload.joke}
      > **Réponse**: ${payload.answer}
    `;

    if (similarity !== Similarity.Different) {
      description = stripIndents`
        **Votre blague**
        ${description}
        **[Blague similaire](https://github.com/Blagues-API/blagues-api/blob/master/blagues.json#L${
          6 * jokes[bestMatchIndex].id - 4
        }-L${6 * jokes[bestMatchIndex].id + 1})**
        >>> **Type**: ${CategoriesRefs[jokes[bestMatchIndex].type as Category]}
        **Blague**: ${jokes[bestMatchIndex].joke}
        **Réponse**: ${jokes[bestMatchIndex].answer}
      `;
    }

    const embed: MessageEmbedOptions = {
      author: {
        icon_url: interaction.user.displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: interaction.user.tag
      },
      description,
      footer: {
        text:
          similarity === Similarity.Different
            ? `${neededApprovals} approbations nécessaire`
            : interaction.guild!.name,
        icon_url: interaction.guild!.iconURL({
          format: 'png',
          size: 32,
          dynamic: true
        })!
      },
      color: Colors[similarity] as ColorResolvable,
      timestamp: new Date()
    };

    if (similarity === Similarity.Same) {
      return interaction.reply({
        content: 'Cette blague existe déjà.',
        embeds: [embed],
        ephemeral: true
      });
    }

    const message = {
      content: [
        "Votre blague est sur le point d'être ajouté aux suggestions de blagues, veuillez confirmer la suggestion si vous êtes sûr qu'elle ne contient pas de fautes.",
        similarity === Similarity.Like &&
          "⚠️ Attention, une blague qui y ressemblant existe déjà, êtes vous sûr qu'elle est différente ?"
      ]
        .filter((l) => l)
        .join('\n\n'),
      embeds: [embed]
    };

    const confirmation = await this.waitForConfirmation(message, interaction);
    if (!confirmation) return;

    if (confirmation.customId === 'cancel') {
      return confirmation.update({
        content: "La blague n'a pas été envoyé",
        components: [],
        embeds: [embed]
      });
    }

    const channel: TextChannel = interaction.guild!.channels.cache.get(
      suggestsChannel
    ) as TextChannel;

    const suggestion = await channel.send({ embeds: [embed] });

    await prisma.proposal.create({
      data: {
        user_id: interaction.user.id,
        message_id: suggestion.id,
        type: ProposalType.SUGGESTION,
        joke_question: payload.joke,
        joke_answer: payload.answer,
        joke_type: payload.type
      }
    });

    for (const reaction of [upReaction, downReaction]) {
      await suggestion.react(reaction).catch(() => null);
    }

    return confirmation.update({
      content: 'La blague à été envoyée',
      components: [],
      embeds: []
    });
  }

  async waitForConfirmation(
    messageData: Partial<MessageOptions>,
    interaction: CommandInteraction
  ): Promise<ButtonInteraction | null> {
    const message = (await interaction.reply({
      ...messageData,
      components: [
        {
          type: 'ACTION_ROW',
          components: [
            new MessageButton({
              label: 'Envoyer',
              customId: 'send',
              style: 'SUCCESS'
            }),
            new MessageButton({
              label: 'Annuler',
              customId: 'cancel',
              style: 'DANGER'
            })
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    })) as Message;

    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        max: 1,
        filter: (i: MessageComponentInteraction) =>
          i.user.id === interaction.user.id
      });
      collector.once(
        'end',
        async (
          interactions: Collection<string, ButtonInteraction>,
          reason: string
        ) => {
          const buttonInteraction = interactions.first();
          if (!buttonInteraction) {
            if (reason !== 'time') resolve(null);
            if (message.deletable) await message.delete();
            await interaction.reply({
              content: 'Les 60 secondes sont écoulées',
              ephemeral: true
            });
            return resolve(null);
          }

          return resolve(buttonInteraction);
        }
      );
    });
  }
}
