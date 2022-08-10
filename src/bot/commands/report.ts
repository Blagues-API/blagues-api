import { jokeById, jokeByQuestion } from '../../controllers';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Interaction,
  SelectMenuInteraction,
  TextChannel
} from 'discord.js';
import { CategoriesRefs, Joke, ReasonsRefs } from '../../typings';
import { Colors, commandsChannelId, reportsChannelId } from '../constants';
import Command from '../lib/command';
import { findBestMatch } from 'string-similarity';
import { interactionInfo, interactionProblem, isEmbedable, messageInfo, waitForConfirmation } from '../utils';
import Jokes from '../../jokes';
import prisma from '../../prisma';
import { ReportType } from '@prisma/client';
export default class ReportCommand extends Command {
  constructor() {
    super({
      name: 'report',
      description: 'Signaler une blague',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'id',
          description: 'ID de la blague',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'raison',
          description: 'Raison du signalement de la blague',
          required: true,
          choices: Object.entries(ReasonsRefs).map(([key, name]) => ({
            name: name,
            value: key
          }))
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'informations',
          description: 'Informations supplémentaires',
          required: false
        }
      ]
    });
  }
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }

    const jokeId = interaction.options.getInteger('id', true);
    const joke = jokeById(jokeId);
    if (!joke) {
      return interaction.reply(interactionInfo(`L'identifiant \`${jokeId}\` ne correspond à aucune blague connue.`));
    }

    const isAlreadyReport = await prisma.proposal.findMany({
      where: {
        joke_id: joke.id
      },
      select: {
        reports: true
      }
    });

    if (isAlreadyReport.filter((p) => p.reports).length > 0) {
      return interaction.reply(interactionProblem('Cette blague a déjà été signalée.', true));
    }

    const reason = interaction.options.getString('raison', true) as keyof typeof ReasonsRefs;

    const embed = {
      author: {
        name: interaction.user.tag,
        icon_url: interaction.user.displayAvatarURL({
          size: 32
        })
      },
      fields: [
        {
          name: 'Blague signalée',
          value: `
          > **Type**: ${CategoriesRefs[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}
          `,
          inline: true
        }
      ],
      color: Colors.PROPOSED
    };

    if (reason === ReasonsRefs.DUPLICATE) {
      const duplicate = await this.getDuplicate(interaction, joke);
      if (!duplicate) return;

      embed.fields.push({
        name: 'Doublon',
        value: `
        > **Type**: ${CategoriesRefs[duplicate.type]}
        > **Blague**: ${duplicate.joke}
        > **Réponse**: ${duplicate.answer}
        `,
        inline: false
      });

      return await this.reportJoke(interaction, duplicate, embed, reason);
    } else {
      embed.fields.push({
        name: 'Raison',
        value: ReasonsRefs[reason],
        inline: false
      });

      return await this.reportJoke(interaction, joke, embed, reason);
    }
  }

  async getDuplicate(commandInteraction: ChatInputCommandInteraction<'cached'>, joke: Joke): Promise<Joke | null> {
    const { ratings } = findBestMatch(
      `${joke.joke}|${joke.answer}`,
      Jokes.list.map((entry) => `${entry.joke}|${entry.answer}`)
    );
    ratings
      .sort((a, b) => a.rating - b.rating)
      .reverse()
      .splice(11, ratings.length - 11);
    ratings.shift();
    const question = await commandInteraction[commandInteraction.replied ? 'editReply' : 'reply']({
      embeds: [
        {
          title: `Quel est le doublon de la blague suivante ? (ID : \`${joke.id}\`)`,
          description: `
          > **Type**: ${CategoriesRefs[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}
          `,
          color: Colors.PROPOSED
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.SelectMenu,
              customId: 'duplicate',
              placeholder: 'Choisissez un doublon...',
              options: ratings.map((value, index) => ({
                label: `${index + 1}. Ressemblance à ${(value.rating * 100).toFixed(0)} %`,
                value: jokeByQuestion(value.target.split('|')[0])!.id.toString(),
                description: value.target.split('|')[0].slice(0, 100)
              })),
              maxValues: 1,
              minValues: 1
            }
          ]
        }
      ],
      fetchReply: true
    });

    const selectInteraction = await question
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === commandInteraction.user.id,
        componentType: ComponentType.SelectMenu,
        time: 60_000
      })
      .catch(() => null);

    if (!selectInteraction) {
      question.edit(messageInfo('Les 60 secondes se sont écoulées.'));
      return null;
    }

    return this.checkDuplicate(commandInteraction, selectInteraction);
  }

  async checkDuplicate(
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    selectInteraction: SelectMenuInteraction
  ): Promise<Joke | null> {
    const duplicate = jokeById(+selectInteraction.values[0])!;
    const baseEmbed = selectInteraction.message.embeds[0].toJSON();
    await selectInteraction.update({
      embeds: [
        baseEmbed,
        {
          color: Colors.PRIMARY,
          title: 'Est-ce bien le doublon que vous avez choisi ?',
          description: `
          > **Type**: ${CategoriesRefs[duplicate.type]}
          > **Blague**: ${duplicate.joke}
          > **Réponse**: ${duplicate.answer}
          `
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              label: 'Oui',
              customId: 'yes',
              type: ComponentType.Button,
              style: ButtonStyle.Success
            },
            {
              label: 'Non',
              customId: 'no',
              type: ComponentType.Button,
              style: ButtonStyle.Danger
            }
          ]
        }
      ]
    });

    const buttonInteraction = await selectInteraction.message
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === selectInteraction.user.id,
        componentType: ComponentType.Button,
        time: 60_000
      })
      .catch(() => null);

    if (!buttonInteraction) {
      selectInteraction.message.edit(messageInfo('Les 60 secondes se sont écoulées.'));
      return null;
    }

    const joke = jokeById(commandInteraction.options.getInteger('id', true))!;

    switch (buttonInteraction.customId) {
      case 'yes':
        return duplicate;
      case 'no':
        return this.getDuplicate(commandInteraction, joke);
      default:
        return null;
    }
  }

  async reportJoke(
    interaction: ChatInputCommandInteraction<'cached'>,
    joke: Joke,
    embed: APIEmbed,
    reportReason: ReportType
  ) {
    const confirmation = await waitForConfirmation(interaction, embed, 'report');
    if (!confirmation) return;

    if (confirmation.customId === 'cancel') {
      return confirmation.update({
        content: "Le signalement n'a pas été envoyée.",
        components: [],
        embeds: [embed]
      });
    }

    const reportsChannel = interaction.guild!.channels.cache.get(reportsChannelId) as TextChannel;
    if (!isEmbedable(reportsChannel)) {
      return interaction.reply(
        interactionProblem(`Je n'ai pas la permission d'envoyer la blague dans le salon ${reportsChannel}.`, false)
      );
    }

    const message = await reportsChannel.send({ embeds: [embed] });

    await prisma.proposal.update({
      where: {
        joke_id: joke.id
      },
      data: {
        reports: {
          create: {
            message_id: message.id,
            user_id: interaction.user.id,
            type: reportReason
          }
        }
      }
    });
  }
}
