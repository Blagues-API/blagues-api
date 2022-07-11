// npx tsc-watch --onSuccess "node dist/index.js
import { jokeById, jokeByQuestion } from '../../controllers';
import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, Message } from 'discord.js';
import { Category, CategoriesRefsFull, Reason, ReportReasons, UnsignedJoke, Joke } from '../../typings';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo, info, messageProblem, tDelete } from '../utils';

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
        },
        {
          name: 'Raison',
          value: ReportReasons[raison as Reason]
        }
      ]
    };

    await interaction.channel!.send({
      embeds: [embed]
    });

    if (raison === 'doublon') {
      const doublon = await this.getDoublon(interaction, joke);

      if (!doublon) return;
    }
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
