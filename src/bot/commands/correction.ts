import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  codeBlock,
  ComponentType,
  hyperlink,
  Message,
  TextChannel
} from 'discord.js';
import { jokeById, jokeByQuestion } from '../../controllers';
import prisma from '../../prisma';
import { CategoriesRefs, Category, JokeTypesDescriptions, UnsignedJoke, UnsignedJokeKey } from '../../typings';
import {
  Colors,
  commandsChannelId,
  correctionsChannelId,
  dataSplitRegex,
  downReactionIdentifier,
  suggestionsChannelId,
  upReactionIdentifier
} from '../constants';
import Command from '../lib/command';
import clone from 'lodash/clone';
import { ProposalType } from '@prisma/client';
import {
  FieldValuesJoke,
  info,
  interactionInfo,
  interactionProblem,
  interactionValidate,
  isEmbedable,
  messageInfo,
  messageProblem,
  showNegativeDiffs,
  showPositiveDiffs,
  tDelete,
  waitForInteraction
} from '../utils';

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

export default class CorrectionCommand extends Command {
  constructor() {
    super({
      name: 'correction',
      description: 'Proposer une modification de blague',
      type: ApplicationCommandType.ChatInput,
      channels: [commandsChannelId],
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'recherche',
          description: 'ID ou question de la blague ou ID du message',
          required: true
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const query = interaction.options.getString('recherche', true);

    const joke = await this.resolveJoke(interaction, query);
    if (!joke) return;

    const newJoke = await this.requestChanges(interaction, clone(joke));
    if (!newJoke) return;

    await this.editJoke(interaction, joke, newJoke);
  }

  async resolveJoke(
    interaction: ChatInputCommandInteraction<'cached'>,
    query: string
  ): Promise<JokeCorrectionPayload | null> {
    const joke = await this.findJoke(interaction, query);
    if (joke) return joke;

    const question = await interaction.reply({
      embeds: [
        {
          title: 'Quelle blague voulez-vous corriger ?',
          description:
            "Il faut tout d'abord identifier la blague. Pour cela, il faut l'identifiant de la blague, l'identifiant du message la proposant ou la question de celle-ci.",
          color: Colors.PRIMARY
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
        if (msg.deletable) await msg.delete();
        const joke = await this.findJoke(interaction, msg.content);

        if (joke) {
          collector.stop();
          return resolve(joke);
        }
      });
      collector.once('end', async (_collected, reason: string) => {
        if (reason === 'idle') {
          await interaction.editReply({
            embeds: [question.embeds[0], info('Les 60 secondes se sont écoulées.')]
          });
          return resolve(null);
        }
      });
    });
  }

  async requestChanges(
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    joke: JokeCorrectionPayload,
    changes = false
  ): Promise<JokeCorrectionPayload | null> {
    const embed = {
      title: `Quels${changes ? ' autres' : ''} changements voulez-vous faire ?`,
      description: FieldValuesJoke(CategoriesRefs[joke.type], joke.joke, joke.answer),
      color: Colors.PRIMARY
    };
    const question = (await commandInteraction[commandInteraction.replied ? 'editReply' : 'reply']({
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              label: 'Type',
              customId: 'type',
              type: ComponentType.Button,
              style: ButtonStyle.Primary
            },
            {
              label: 'Question',
              customId: 'question',
              type: ComponentType.Button,
              style: ButtonStyle.Primary
            },
            {
              label: 'Réponse',
              customId: 'answer',
              type: ComponentType.Button,
              style: ButtonStyle.Primary
            },
            {
              label: 'Valider',
              customId: 'confirm',
              type: ComponentType.Button,
              style: ButtonStyle.Success
            },
            {
              label: 'Annuler',
              customId: 'cancel',
              type: ComponentType.Button,
              style: ButtonStyle.Secondary
            }
          ]
        }
      ],
      fetchReply: true
    })) as Message<true>;

    const buttonInteraction = await waitForInteraction({
      component_type: ComponentType.Button,
      message: question,
      user: commandInteraction.user,
      idle: 120_000
    });

    if (!buttonInteraction) {
      await commandInteraction.editReply(interactionInfo('Les 2 minutes se sont écoulées.'));
      return null;
    }

    switch (buttonInteraction.customId) {
      case 'type': {
        const response = await this.requestTypeChange(buttonInteraction, commandInteraction, joke);
        if (!response) return null;

        return this.requestChanges(commandInteraction, joke, true);
      }

      case 'question': {
        const response = await this.requestTextChange(
          buttonInteraction,
          commandInteraction,
          joke,
          'question',
          joke.joke
        );
        if (!response) return null;

        return this.requestChanges(commandInteraction, response, true);
      }
      case 'answer': {
        const response = await this.requestTextChange(
          buttonInteraction,
          commandInteraction,
          joke,
          'réponse',
          joke.answer
        );
        if (!response) return null;

        return this.requestChanges(commandInteraction, response, true);
      }
      case 'confirm':
        return joke;
      default:
        await commandInteraction.deleteReply();
        return null;
    }
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
              `Impossible de trouver une blague ou correction liée à cet ID de blague, assurez vous que cet ID provient bien d\'un message envoyé par le bot ${interaction.client.user}.`
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

  async requestTextChange(
    buttonInteraction: ButtonInteraction<'cached'>,
    commandInteraction: ChatInputCommandInteraction,
    joke: JokeCorrectionPayload,
    textReplyContent: string,
    oldValue: string
  ): Promise<JokeCorrectionPayload | null> {
    const baseEmbed = buttonInteraction.message.embeds[0].toJSON();
    await buttonInteraction.update({
      embeds: [
        baseEmbed,
        {
          color: Colors.PRIMARY,
          title: `Par quelle ${textReplyContent} voulez-vous changer la ${textReplyContent} actuelle ?`,
          description: codeBlock(oldValue)
        }
      ],
      components: []
    });

    return new Promise((resolve) => {
      const collector = commandInteraction.channel!.createMessageCollector({
        filter: (m: Message) => m.author.id === commandInteraction.user.id,
        idle: 60_000
      });
      collector.on('collect', async (msg: Message) => {
        if (msg.deletable) await msg.delete();

        if (msg.content.length > 130) {
          commandInteraction
            .channel!.send(
              interactionProblem(`La ${textReplyContent} d'une blague ne peut pas dépasser 130 caractères.`)
            )
            .then(tDelete(5_000));
        } else {
          joke[textReplyContent === 'question' ? 'joke' : 'answer'] = msg.content.replace(/\n/g, ' ');
          collector.stop();
          return resolve(joke);
        }
      });
      collector.once('end', async (_collected, reason: string) => {
        if (reason === 'idle') {
          await commandInteraction.editReply(interactionInfo('Les 60 secondes se sont écoulées.'));
          return resolve(null);
        }
      });
    });
  }

  async requestTypeChange(
    buttonInteraction: ButtonInteraction<'cached'>,
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    joke: JokeCorrectionPayload
  ): Promise<JokeCorrectionPayload | null> {
    const baseEmbed = buttonInteraction.message.embeds[0].toJSON();
    const questionMessage = (await buttonInteraction.update({
      embeds: [
        baseEmbed,
        {
          color: Colors.PRIMARY,
          title: `Par quel type de blague voulez-vous changer le type actuel ?`
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.SelectMenu,
              customId: 'type',
              placeholder: 'Nouveau type de blague',
              options: Object.entries(CategoriesRefs).map(([key, name]) => ({
                label: name,
                value: key,
                description: JokeTypesDescriptions[key as Category]
              })),
              maxValues: 1,
              minValues: 1
            }
          ]
        }
      ],
      fetchReply: true
    })) as Message<true>;

    const response = await waitForInteraction({
      component_type: ComponentType.SelectMenu,
      message: questionMessage,
      user: commandInteraction.user
    });

    if (!response) {
      await questionMessage.edit(messageInfo('Les 60 secondes se sont écoulées.'));
      return null;
    }

    joke.type = response.values[0] as Category;

    await response.deferUpdate();

    return joke;
  }

  async editJoke(
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    oldJoke: JokeCorrectionPayload,
    newJoke: JokeCorrectionPayload
  ) {
    if (!(['type', 'joke', 'answer'] as UnsignedJokeKey[]).some((key) => newJoke[key] !== oldJoke[key])) {
      await commandInteraction.editReply(interactionProblem("Aucun élément n'a été modifié"));
      return;
    }

    const correctionsChannel: TextChannel = commandInteraction.client.channels.cache.get(
      correctionsChannelId
    ) as TextChannel;
    if (!isEmbedable(correctionsChannel)) {
      return commandInteraction.reply(
        interactionProblem(`Je n'ai pas la permission d'envoyer la correction dans le salon ${correctionsChannel}.`)
      );
    }

    const message = await correctionsChannel.send({
      embeds: [
        {
          author: {
            name: commandInteraction.user.username,
            icon_url: commandInteraction.user.displayAvatarURL({
              size: 32
            })
          },
          fields: [
            {
              name: 'Blague initiale',
              value: FieldValuesJoke(
                showNegativeDiffs(CategoriesRefs[newJoke.suggestion.type], CategoriesRefs[newJoke.type]),
                showNegativeDiffs(newJoke.suggestion.joke, newJoke.joke),
                showNegativeDiffs(newJoke.suggestion.answer, newJoke.answer)
              )
            },
            {
              name: 'Blague corrigée',
              value: FieldValuesJoke(
                showPositiveDiffs(CategoriesRefs[newJoke.suggestion.type], CategoriesRefs[newJoke.type]),
                showPositiveDiffs(newJoke.suggestion.joke, newJoke.joke),
                showPositiveDiffs(newJoke.suggestion.answer, newJoke.answer)
              )
            }
          ],
          color: Colors.PROPOSED
        }
      ]
    });

    await prisma.proposal.create({
      data: {
        user_id: commandInteraction.user.id,
        message_id: message.id,
        type: ProposalType[newJoke.correction_type],
        joke_question: newJoke.joke,
        joke_answer: newJoke.answer,
        joke_type: newJoke.type,
        suggestion: {
          connect: {
            id: newJoke.suggestion.proposal_id
          }
        }
      }
    });

    if (newJoke.suggestion.message_id) {
      const suggestionsChannel: TextChannel = commandInteraction.client.channels.cache.get(
        suggestionsChannelId
      ) as TextChannel;
      const suggestionMessage = await suggestionsChannel.messages.fetch(newJoke.suggestion.message_id);

      const embed = suggestionMessage.embeds[0].toJSON();

      const { base, godfathers } = embed.description!.match(dataSplitRegex)!.groups!;

      const correctionText = `⚠️ Une ${hyperlink('correction', message.url)} est en cours.`;
      embed.description = [base, correctionText, godfathers].filter(Boolean).join('\n\n');

      await suggestionMessage.edit({ embeds: [embed] });
    }

    await commandInteraction.editReply(
      interactionValidate(`Votre ${hyperlink('proposition de correction', message.url)} a bien été envoyée !`)
    );

    for (const reaction of [upReactionIdentifier, downReactionIdentifier]) {
      await message.react(reaction).catch(() => null);
    }
  }
}
