import { stripIndents } from 'common-tags';
import {
  ButtonInteraction,
  CommandInteraction,
  Message,
  MessageButton,
  MessageComponentInteraction,
  MessageEmbedOptions,
  TextChannel
} from 'discord.js';
import { findBestMatch } from 'string-similarity';
import Jokes from '../../jokes';
import { Category, CategoriesRefs, UnsignedJoke } from '../../typings';
import { Colors, guildId, suggestionsChannel, upReaction, downReaction } from '../constants';
import Command from '../lib/command';
import { interactionProblem, isEmbedable } from '../utils';
import Collection from '@discordjs/collection';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';

enum Similarity {
  Different,
  Like,
  Same
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
      interaction.reply(interactionProblem("Chaque partie d'une blague ne peut pas dépasser les 130 caractères !"));
      return;
    }

    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${interaction.options.get('joke')!.value} ${interaction.options.get('response')!.value}`,
      Jokes.list.map((entry) => `${entry.joke} ${entry.answer}`)
    );

    // TODO: Compare with saved updates

    const similarity =
      bestMatch.rating > 0.6 ? (bestMatch.rating > 0.8 ? Similarity.Same : Similarity.Like) : Similarity.Different;

    const payload = {
      type: interaction.options.get('type')!.value as Category,
      joke: interaction.options.get('joke')!.value,
      answer: interaction.options.get('response')!.value
    } as UnsignedJoke;

    const embed: MessageEmbedOptions = {
      author: {
        icon_url: interaction.user.displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: interaction.user.tag
      },
      description: stripIndents`
        > **Type**: ${CategoriesRefs[payload.type]}
        > **Blague**: ${payload.joke}
        > **Réponse**: ${payload.answer}
      `,
      color: Colors.PROPOSED
    };

    if (similarity !== Similarity.Different) {
      const jokeMessage = await prisma.proposal.findUnique({
        select: { message_id: true },
        where: {
          joke_id: Jokes.list[bestMatchIndex].id
        }
      });

      if (jokeMessage) {
        embed.description += `\n⚠️ Une [blague déjà existante](https://discord.com/channels/${guildId}/${suggestionsChannel}/${
          jokeMessage.message_id
        }) y ressemble ${similarity === Similarity.Same ? 'à plus de 80%' : 'fortement'}`;
      } else {
        embed.fields = [
          {
            name: 'Blague y ressemblant',
            value: stripIndents`
              > **Type**: ${CategoriesRefs[Jokes.list[bestMatchIndex].type as Category]}
              > **Blague**: ${Jokes.list[bestMatchIndex].joke}
              > **Réponse**: ${Jokes.list[bestMatchIndex].answer}
            `
          }
        ];
      }
    }

    if (similarity === Similarity.Same) {
      return interaction.reply({
        content: 'Cette blague existe déjà.',
        embeds: [embed],
        ephemeral: true
      });
    }

    const confirmation = await this.waitForConfirmation(interaction, embed);
    if (!confirmation) return;

    if (confirmation.customId === 'cancel') {
      return confirmation.update({
        content: "La blague n'a pas été envoyé",
        components: [],
        embeds: [embed]
      });
    }

    const channel: TextChannel = interaction.guild!.channels.cache.get(suggestionsChannel) as TextChannel;
    if (!isEmbedable(channel)) {
      return interaction.reply(
        interactionProblem(`Je n'ai pas la permission d'envoyer la blague dans le salon ${channel}.`, false)
      );
    }

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
    interaction: CommandInteraction,
    embed: MessageEmbedOptions
  ): Promise<ButtonInteraction | null> {
    const message = (await interaction.reply({
      content: 'Êtes-vous sûr de vouloir confirmer la proposition de cette blague ?',
      embeds: [embed],
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
        filter: (i: MessageComponentInteraction) => i.user.id === interaction.user.id
      });
      collector.once('end', async (interactions: Collection<string, ButtonInteraction>, reason: string) => {
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
      });
    });
  }
}
