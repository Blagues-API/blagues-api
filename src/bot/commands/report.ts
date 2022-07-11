// npx tsc-watch --onSuccess "node dist/index.js
import { jokeById, jokeByQuestion } from '../../controllers';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Message,
  MessageComponentInteraction,
  TextChannel
} from 'discord.js';
import { Category, CategoriesRefsFull, ReportReasons, UnsignedJoke, Joke } from '../../typings';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { compareTwoStrings } from 'string-similarity';
import { interactionInfo, interactionProblem, info, messageProblem, tDelete, isEmbedable } from '../utils';
import { reportsChannelId } from '../constants';

enum IdType {
  MESSAGE_ID,
  JOKE_ID,
  MESSAGE_QUESTION
}

interface JokeCorrectionPayload extends UnsignedJoke {
  id?: number;
  correction_type: ProposalType;
  suggestion: UnsignedJoke & {
    message_id: string | null;
    proposal_id: number;
  };
}

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
          choices: Object.entries(ReportReasons).map(([key, name]) => ({
            name,
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

    // TODO : ajouter un choix pour signaler une blague refusée injustement

    const jokeId = interaction.options.getInteger('id', true);
    const joke = jokeById(jokeId);
    if (!joke) {
      return interaction.reply(interactionInfo(`L'identifiant \`${jokeId}\` ne correspond à aucune blague connue.`));
    }

    const raison = interaction.options.getString('raison', true);

    const embed = {
      author: {
        name: interaction.user.username,
        icon_url: interaction.user.displayAvatarURL({
          size: 32
        })
      },
      fields: [
        {
          name: 'Blague signalée',
          value: `
          > **Type**: ${CategoriesRefsFull[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}
          `,
          inline: true
        }
      ],
      color: Colors.PROPOSED
    };

    await interaction.channel!.send({
      embeds: [embed]
    });

    if (raison === 'doublon') {
      const doublon = await this.getDoublon(interaction, joke);

      if (!doublon) return;

      const match = compareTwoStrings(
        `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
        `${doublon.joke.toLowerCase()} ${doublon.answer.toLowerCase()}`
      );
      if (match < 0.8) {
        return info(`Les blagues \`${jokeId}\` et \`${doublon.id}\` ne sont pas assez ressemblantes.`);
      }
      embed.fields.push({
        name: 'Doublon',
        value: `
        > **Type**: ${CategoriesRefsFull[doublon.type]}
        > **Blague**: ${doublon.joke}
        > **Réponse**: ${doublon.answer}
        `,
        inline: true
      });

      const confirmation = await this.waitForSendConfirmation(interaction, embed, match);
      if (!confirmation) return;

      if (confirmation.customId === 'cancel') {
        return confirmation.update({
          content: "La blague n'a pas été envoyée.",
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

      if (confirmation.customId !== 'send') {
        return interaction.reply(
          interactionProblem("Il y a eu une erreur lors de l'exécution de la commande, veillez contacter")
        );
      }

      return interaction.reply({
        embeds: [embed]
      });
    }
  }

  async waitForSendConfirmation(
    interaction: ChatInputCommandInteraction,
    embed: APIEmbed,
    match: number
  ): Promise<ButtonInteraction | null> {
    const message = await interaction.reply({
      content: `${match > 0.9 ? 'Voulez-vous' : 'Êtes-vous sûr de vouloir'} envoyer le signalement suivant ?`,
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

  async getDoublon(
    interaction: ChatInputCommandInteraction<'cached'>,
    joke: Joke
  ): Promise<JokeCorrectionPayload | null> {
    const question = await interaction.reply({
      embeds: [
        {
          title: `Quel est le doublon de la blague suivante ? (ID : \`${joke.id}\`)`,
          description: `
          > **Type**: ${CategoriesRefsFull[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}

          Répondez par \`cancel\` pour annuler la commande.
          `,
          color: Colors.PROPOSED
        }
      ],
      fetchReply: true
    });

    return new Promise((resolve) => {
      const collector = question.channel.createMessageCollector({
        filter: (m: Message) => m.author.id === interaction.user.id,
        idle: 60_000
      });
      collector.on('collect', async (msg: Message) => {
        if (msg.deletable) setInterval(() => msg.delete().catch(() => null), 5000);
        const joke = await this.findJoke(interaction, msg.content);

        if (joke) {
          collector.stop();
          return resolve(joke);
        }
      });
      collector.once('end', async (_collected, reason: string) => {
        if (reason === 'idle') {
          await interaction.editReply({
            embeds: [info('Les 60 secondes se sont écoulées.')]
          });
          return resolve(null);
        }
      });
    });
  }

  async findJoke(
    interaction: ChatInputCommandInteraction<'cached'>,
    query: string
  ): Promise<JokeCorrectionPayload | null> {
    const idType = this.getIdType(query);
    if (idType === IdType.MESSAGE_ID) {
      const proposal = await prisma.proposal.findUnique({
        where: {
          message_id: query
        },
        include: {
          corrections: {
            take: 1,
            orderBy: {
              created_at: 'desc'
            },
            where: {
              merged: false,
              refused: false
            }
          },
          suggestion: {
            include: {
              corrections: {
                take: 1,
                orderBy: {
                  created_at: 'desc'
                },
                where: {
                  merged: false,
                  refused: false
                }
              }
            }
          }
        }
      });
      if (!proposal) {
        interaction.channel
          ?.send(
            messageProblem(
              `Impossible de trouver une blague ou correction liée à cet ID de blague, assurez vous que cet ID provient bien d\'un message envoyé par le bot ${interaction.client.user}`
            )
          )
          .then(tDelete(5000));
        return null;
      }

      const origin = proposal.type === ProposalType.SUGGESTION ? proposal : proposal.suggestion!;

      return {
        id: proposal.joke_id ?? undefined,
        type: (origin.corrections[0]?.joke_type ?? origin.joke_type) as Category,
        joke: (origin.corrections[0]?.joke_question ?? origin.joke_question)!,
        answer: (origin.corrections[0]?.joke_answer ?? origin.joke_answer)!,
        correction_type: origin.merged ? ProposalType.CORRECTION : ProposalType.SUGGESTION_CORRECTION,
        suggestion: {
          message_id: origin.message_id,
          proposal_id: origin.id,
          type: origin.joke_type as Category,
          joke: origin.joke_question!,
          answer: origin.joke_answer!
        }
      };
    }

    const joke = idType === IdType.JOKE_ID ? jokeById(Number(query)) : jokeByQuestion(query);
    if (!joke) {
      interaction.channel
        ?.send(
          messageProblem(
            `Impossible de trouver une blague à partir de ${
              idType === IdType.JOKE_ID ? 'cet identifiant' : 'cette question'
            }, veuillez réessayer !`
          )
        )
        .then(tDelete(5000));
      return null;
    }

    const proposal = await prisma.proposal.upsert({
      create: {
        joke_id: joke.id,
        joke_type: joke.type,
        joke_question: joke.joke,
        joke_answer: joke.answer,
        type: ProposalType.SUGGESTION,
        merged: true
      },
      include: {
        corrections: {
          take: 1,
          orderBy: {
            created_at: 'desc'
          },
          where: {
            merged: false,
            refused: false
          }
        }
      },
      update: {},
      where: {
        joke_id: joke.id
      }
    });

    const correction = proposal.corrections[0];
    return {
      id: proposal.joke_id!,
      type: (correction?.joke_type ?? proposal.joke_type) as Category,
      joke: (correction?.joke_question ?? proposal.joke_question)!,
      answer: (correction?.joke_answer ?? proposal.joke_answer)!,
      correction_type: ProposalType.CORRECTION,
      suggestion: {
        message_id: proposal.message_id,
        proposal_id: proposal.id,
        type: proposal.joke_type as Category,
        joke: proposal.joke_question!,
        answer: proposal.joke_answer!
      }
    };
  }

  getIdType(query: string): IdType {
    if (isNaN(Number(query))) {
      return IdType.MESSAGE_QUESTION;
    }
    if (query.length > 6) {
      return IdType.MESSAGE_ID;
    }
    return IdType.JOKE_ID;
  }
}
