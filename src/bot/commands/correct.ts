import prisma from '../../prisma';
import {
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  Message,
  MessageContextMenuCommandInteraction,
  MessageCreateOptions,
  TextChannel,
  User
} from 'discord.js';
import { Colors, commandsChannelId, correctionsChannelId, suggestionsChannelId } from '../constants';
import Command from '../lib/command';
import {
  buildJokeDisplay,
  interactionInfo,
  interactionProblem,
  isEmbedable,
  messageInfo,
  waitForInteraction
} from '../utils';
import { ProposalType } from '@prisma/client';
import { CategoriesRefs, Category } from '../../typings';
import CorrectionCommand, { JokeCorrectionPayload } from './correction';
import clone from 'lodash/clone';

export default class CorrectCommand extends Command {
  constructor() {
    super({
      name: 'Correct',
      nameLocalizations: {
        fr: 'Corriger'
      },
      type: ApplicationCommandType.Message,
      channels: [suggestionsChannelId, correctionsChannelId]
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;
    const sourceMessage = await interaction.channel?.messages.fetch(interaction.targetId);
    if (!sourceMessage) return;

    const commandsChannel: TextChannel = interaction.client.channels.cache.get(commandsChannelId) as TextChannel;
    if (!isEmbedable(commandsChannel)) {
      return interaction.reply(
        interactionProblem(`Je n'ai pas la permission d'envoyer la correction dans le salon ${commandsChannel}.`)
      );
    }

    const isSuggestionChannel = channel.id === suggestionsChannelId;
    if (sourceMessage.author.id !== interaction.client.user.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une ${
            isSuggestionChannel ? 'suggestion' : 'correction'
          } qui n'est pas gérée par ${interaction.client.user}.`
        )
      );
    }
    const proposal = await prisma.proposal.findUnique({
      where: {
        message_id: interaction.targetId
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
      return interaction.reply(
        interactionProblem(
          `Impossible d'identifier une blague ou correction liée à ce message de blague, assurez vous que ce message a bien été envoyé par le bot ${interaction.client.user}.`
        )
      );
    }

    const origin = proposal.type === ProposalType.SUGGESTION ? proposal : proposal.suggestion!;
    const joke = {
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

    const data = await this.requestChanges(interaction, commandsChannel, interaction.user, clone(joke));
    if (!data) return;

    await CorrectionCommand.editJoke(data.question, interaction.user, joke, data.newJoke);
  }

  async requestChanges(
    interaction: MessageContextMenuCommandInteraction<'cached'>,
    channel: TextChannel,
    user: User,
    joke: JokeCorrectionPayload,
    oldMessage: Message<true> | null = null
  ): Promise<{ newJoke: JokeCorrectionPayload; question: Message<true> } | null> {
    const messageData: Omit<MessageCreateOptions, 'flags'> = {
      content: user.toString(),
      embeds: [
        {
          title: `Quels${oldMessage ? ' autres' : ''} changements voulez-vous faire ?`,
          description: buildJokeDisplay(CategoriesRefs[joke.type], joke.joke, joke.answer),
          color: Colors.PRIMARY
        }
      ],
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
      ]
    };
    const question = await (oldMessage ? oldMessage.edit(messageData) : channel.send(messageData));

    if (!oldMessage)
      interaction.reply(interactionInfo(`La [correction](${question.url}) a débuté dans le salon ${channel}.`));

    const buttonInteraction = await waitForInteraction({
      componentType: ComponentType.Button,
      message: question,
      user,
      idle: 120_000
    });

    if (!buttonInteraction) {
      await question.edit(messageInfo('Les 2 minutes se sont écoulées.'));
      return null;
    }

    switch (buttonInteraction.customId) {
      case 'type': {
        const response = await CorrectionCommand.requestTypeChange(buttonInteraction, joke);
        if (!response) return null;

        return this.requestChanges(interaction, channel, user, joke, question);
      }

      case 'question': {
        const response = await CorrectionCommand.requestTextChange(buttonInteraction, joke, 'question', joke.joke);
        if (!response) return null;

        return this.requestChanges(interaction, channel, user, response, question);
      }
      case 'answer': {
        const response = await CorrectionCommand.requestTextChange(buttonInteraction, joke, 'réponse', joke.answer);
        if (!response) return null;

        return this.requestChanges(interaction, channel, user, response, question);
      }
      case 'confirm':
        await buttonInteraction.deferUpdate();
        return { question, newJoke: joke };
      default:
        await question.edit(messageInfo('Correction annulée.'));
        return null;
    }
  }
}
