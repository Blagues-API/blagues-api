import { stripIndents } from 'common-tags';
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  MessageComponentInteraction,
  TextChannel,
  APIEmbed
} from 'discord.js';
import { findBestMatch } from 'string-similarity';
import Jokes from '../../jokes';
import { Category, CategoriesRefs, UnsignedJoke } from '../../typings';
import {
  Colors,
  suggestionsChannelId,
  upReactionIdentifier,
  downReactionIdentifier,
  commandsChannelId
} from '../constants';
import Command from '../lib/command';
import { interactionInfo, interactionProblem, interactionValidate, isEmbedable } from '../utils';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'suggestion',
      description: 'Proposer une blague',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'type',
          description: 'Général, Développeur, Noir, +18, Beauf, Blondes',
          required: true,
          choices: Object.entries(CategoriesRefs).map(([key, name]) => ({
            name,
            value: key
          }))
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'joke',
          description: 'Contenue de la blague',
          required: true,
          max_length: 130
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'response',
          description: 'Réponse de la blague',
          required: true,
          max_length: 130
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }

    const proposals = await prisma.proposal.findMany({
      select: {
        joke_type: true,
        joke_question: true,
        joke_answer: true
      },
      where: {
        type: ProposalType.SUGGESTION,
        merged: false,
        refused: false
      }
    });

    const currentJokes = [
      ...Jokes.list,
      ...proposals.map((entry) => ({
        type: entry.joke_type,
        joke: entry.joke_question,
        answer: entry.joke_answer
      }))
    ];

    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${interaction.options.getString('joke', true)} ${interaction.options.get('response')!.value}`,
      currentJokes.map((entry) => `${entry.joke} ${entry.answer}`)
    );

    const payload = {
      type: interaction.options.getString('type', true) as Category,
      joke: interaction.options.getString('joke', true),
      answer: interaction.options.getString('response', true)
    } as UnsignedJoke;

    const embed: APIEmbed = {
      author: {
        icon_url: interaction.user.displayAvatarURL({
          size: 32
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

    if (bestMatch.rating > 0.6) {
      embed.fields = [
        {
          name: 'Blague similaire',
          value: stripIndents`
              > **Type**: ${CategoriesRefs[currentJokes[bestMatchIndex].type as Category]}
              > **Blague**: ${currentJokes[bestMatchIndex].joke}
              > **Réponse**: ${currentJokes[bestMatchIndex].answer}
            `
        }
      ];
    }

    if (bestMatch.rating > 0.8) {
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

    const suggestionsChannel = interaction.guild!.channels.cache.get(suggestionsChannelId) as TextChannel;
    if (!isEmbedable(suggestionsChannel)) {
      return interaction.reply(
        interactionProblem(`Je n'ai pas la permission d'envoyer la blague dans le salon ${suggestionsChannel}.`, false)
      );
    }

    const suggestion = await suggestionsChannel.send({ embeds: [embed] });

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

    for (const reaction of [upReactionIdentifier, downReactionIdentifier]) {
      await suggestion.react(reaction).catch(() => null);
    }

    return confirmation.update(interactionValidate(`La [blague](${suggestion.url}) a été envoyé !`, false));
  }

  async waitForConfirmation(
    interaction: ChatInputCommandInteraction,
    embed: APIEmbed
  ): Promise<ButtonInteraction | null> {
    const message = await interaction.reply({
      content: 'Êtes-vous sûr de vouloir confirmer la proposition de cette blague ?',
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Envoyer',
              customId: 'send',
              style: ButtonStyle.Success
            },
            {
              type: ComponentType.Button,
              label: 'Annuler',
              customId: 'cancel',
              style: ButtonStyle.Danger
            }
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    });

    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        max: 1,
        componentType: ComponentType.Button,
        filter: (i: MessageComponentInteraction) => i.user.id === interaction.user.id,
        time: 60_000
      });
      collector.once('end', async (interactions, reason) => {
        const buttonInteraction = interactions.first();
        if (!buttonInteraction) {
          if (reason !== 'time') resolve(null);
          if (message.deletable) await message.delete();
          await interaction.reply(interactionInfo('Les 60 secondes se sont ecoulées.'));
          return resolve(null);
        }

        return resolve(buttonInteraction);
      });
    });
  }
}
