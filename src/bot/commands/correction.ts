import { stripIndents } from 'common-tags';
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Interaction,
  Message,
  TextChannel
} from 'discord.js';
import prisma from '../../prisma';
import { Category, JokeTypesDescriptions, CategoriesRefs, UnsignedJokeKey } from '../../typings';
import {
  Colors,
  commandsChannelId,
  correctionsChannelId,
  dataSplitRegex,
  downReaction,
  suggestionsChannelId,
  upReaction
} from '../constants';
import Command from '../lib/command';
import clone from 'lodash/clone';
import { ProposalType } from '@prisma/client';
import {
  messageInfo,
  interactionInfo,
  interactionProblem,
  interactionValidate,
  isEmbedable,
  showNegativeDiffs,
  showPositiveDiffs,
  info,
  JokeCorrectionPayload,
  findJoke
} from '../utils';

export default class CorrectionCommand extends Command {
  constructor() {
    super({
      name: 'correction',
      description: 'Proposer une modification de blague',
      type: ApplicationCommandType.ChatInput,
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

    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }

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
    const joke = await findJoke(interaction, query);
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
        if (msg.deletable) setInterval(() => msg.delete().catch(() => null), 5000);
        const joke = await findJoke(interaction, msg.content);

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
      description: stripIndents`
        > **Type:** ${CategoriesRefs[joke.type]}
        > **Question:** ${joke.joke}
        > **Réponse:** ${joke.answer}
      `,
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

    const buttonInteraction = await question
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === commandInteraction.user.id,
        componentType: ComponentType.Button,
        time: 120_000
      })
      .catch(() => null);

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

  async requestTextChange(
    buttonInteraction: ButtonInteraction,
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
          description: `\`\`\`${oldValue}\`\`\``
        }
      ],
      components: []
    });

    const messages = await commandInteraction
      .channel!.awaitMessages({
        filter: (m: Message) => m.author.id === commandInteraction.user.id,
        time: 60_000,
        max: 1
      })
      .catch(() => null);

    // TODO: Vérifier la taille comme pour les suggestions

    const msg = messages?.first();
    if (!msg) {
      await buttonInteraction.editReply(interactionInfo('Les 60 secondes se sont écoulées.', false));
      return null;
    }

    if (msg.deletable) await msg.delete();

    joke[textReplyContent === 'question' ? 'joke' : 'answer'] = msg.content.replace(/\n/g, ' ');

    return joke;
  }

  async requestTypeChange(
    buttonInteraction: ButtonInteraction<'cached'>,
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    joke: JokeCorrectionPayload
  ): Promise<JokeCorrectionPayload | null> {
    const baseEmbed = buttonInteraction.message.embeds[0].toJSON();
    const questionMessage = await buttonInteraction.update({
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
    });

    const response = await questionMessage
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === commandInteraction.user.id,
        componentType: ComponentType.SelectMenu,
        time: 60_000
      })
      .catch(() => null);

    if (!response) {
      questionMessage.edit(messageInfo('Les 60 secondes se sont écoulées.'));
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
        interactionProblem(
          `Je n'ai pas la permission d'envoyer la correction dans le salon ${correctionsChannel}.`,
          false
        )
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
              value: stripIndents`
                > **Type**: ${showNegativeDiffs(CategoriesRefs[newJoke.suggestion.type], CategoriesRefs[newJoke.type])}
                > **Blague**: ${showNegativeDiffs(newJoke.suggestion.joke, newJoke.joke)}
                > **Réponse**: ${showNegativeDiffs(newJoke.suggestion.answer, newJoke.answer)}
              `
            },
            {
              name: 'Blague corrigée',
              value: stripIndents`
                > **Type**: ${showPositiveDiffs(CategoriesRefs[newJoke.suggestion.type], CategoriesRefs[newJoke.type])}
                > **Blague**: ${showPositiveDiffs(newJoke.suggestion.joke, newJoke.joke)}
                > **Réponse**: ${showPositiveDiffs(newJoke.suggestion.answer, newJoke.answer)}
              `
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

      const correctionText = `⚠️ Une [correction](${message.url}) est en cours.`;
      embed.description = [base, correctionText, godfathers].filter(Boolean).join('\n\n');

      await suggestionMessage.edit({ embeds: [embed] });
    }

    await commandInteraction.editReply(
      interactionValidate(`Votre [proposition de correction](${message.url}) a bien été envoyée !`)
    );

    for (const reaction of [upReaction, downReaction]) {
      await message.react(reaction).catch(() => null);
    }
  }
}
