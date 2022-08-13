import { ProposalType } from '@prisma/client';
import { stripIndents } from 'common-tags';
import {
  ApplicationCommandType,
  Message,
  MessageContextMenuCommandInteraction,
  TextChannel,
  APIEmbed
} from 'discord.js';
import prisma from '../../prisma';
import { CategoriesRefs, Category, Correction, ReportExtended, Suggestion } from '../../typings';
import {
  Colors,
  neededSuggestionsApprovals,
  correctionsChannelId,
  suggestionsChannelId,
  logsChannelId,
  jokerRoleId,
  correctorRoleId,
  upReactionIdentifier,
  downReactionIdentifier,
  dataSplitRegex,
  godfatherRoleId,
  reportsChannelId
} from '../constants';
import Command from '../lib/command';
import {
  interactionProblem,
  interactionValidate,
  isEmbedable,
  Declaration,
  isGodfather,
  proposalsCollector,
  reportCollector,
  CollectorOptions
} from '../utils';
import Jokes from '../../jokes';
import { renderGodfatherLine } from '../modules/godfathers';
import { compareTwoStrings } from 'string-similarity';

interface ApproveOptions<T extends Correction | Suggestion | ReportExtended> {
  interaction: MessageContextMenuCommandInteraction<'cached'>;
  proposal: T extends Correction ? Correction : T extends Suggestion ? Suggestion : ReportExtended;
  message: Message;
  embed: APIEmbed;
  automerge?: boolean;
}

export default class ApproveCommand extends Command {
  private readonly collector: Record<
    string,
    (options: CollectorOptions) => Promise<{
      proposal: Correction | Suggestion | ReportExtended;
      embed: APIEmbed;
    } | null>
  >;

  private readonly approve: Record<
    string,
    (options: ApproveOptions<Suggestion | Correction | ReportExtended>) => Promise<void>
  >;

  constructor() {
    super({
      name: 'Approuver',
      type: ApplicationCommandType.Message
    });

    this.collector = {
      [suggestionsChannelId]: proposalsCollector,
      [correctionsChannelId]: proposalsCollector,
      [reportsChannelId]: reportCollector
    };

    this.approve = {
      [suggestionsChannelId]: this.approveSuggestion,
      [correctionsChannelId]: this.approveCorrection,
      [suggestionsChannelId]: this.approveReport
    };
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;

    const message = await interaction.channel?.messages.fetch(interaction.targetId);
    if (!message) return;

    if (![suggestionsChannelId, correctionsChannelId, reportsChannelId].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une suggestion, une correction ou un signalement en dehors des salons <#${suggestionsChannelId}>, <#${correctionsChannelId}> et <#${reportsChannelId}>.`
        )
      );
    }

    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver ${Declaration[channel.id].WITH_UNDEFINED_ARTICLE} qui n'est pas gérée par ${
            interaction.client.user
          }.`
        )
      );
    }

    if (!isGodfather(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un <@&${godfatherRoleId}> peut approuver ${Declaration[channel.id].WITH_UNDEFINED_ARTICLE}.`
        )
      );
    }

    try {
      const response = await this.collector[channel.id]({ interaction, message });
      if (!response) return;
      await this.approve[channel.id]({
        message,
        interaction: interaction,
        embed: response.embed,
        proposal: response.proposal
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        interactionProblem(
          `Une erreur s'est produite lors de l'approbation de la [${Declaration[channel.id].WORD}](${
            message.url
          }), veuillez contacter le développeur !`
        )
      );
    }
  }

  async approveSuggestion({
    interaction,
    proposal,
    message,
    embed,
    automerge = false
  }: ApproveOptions<Suggestion>): Promise<void> {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;

    const member = await interaction.guild?.members.fetch(proposal.user_id!);
    if (member && !member.roles.cache.has(jokerRoleId)) {
      await member.roles.add(jokerRoleId);
    }

    const { success, joke_id } = await Jokes.mergeJoke(proposal);
    if (!success) return;

    interaction.client.refreshStatus();

    await prisma.proposal.updateMany({
      data: {
        merged: true,
        joke_id
      },
      where: { id: proposal.id }
    });

    embed.color = Colors.ACCEPTED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: "Blague ajoutée à l'API",
        embeds: [embed]
      });
    }

    embed.footer = { text: 'Blague ajoutée' };

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      field.value = field.value.match(dataSplitRegex)!.groups!.base;
    } else {
      embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
    }

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    message.client.stickys.reload();

    if (automerge) {
      await interaction.followUp(
        interactionValidate(
          `La [suggestion](${message.url}) a bien été automatiquement ajoutée à l'API suite à la validation de la correction manquante !`
        )
      );
      return;
    }

    await interaction.editReply(interactionValidate(`La [suggestion](${message.url}) a bien été ajoutée à l'API !`));
  }

  async approveReport({ interaction, proposal, message, embed }: ApproveOptions<ReportExtended>): Promise<void> {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;

    const member = await interaction.guild?.members.fetch(proposal.user_id!).catch(() => null);
    if (member && !member.roles.cache.has(jokerRoleId)) {
      await member.roles.add(jokerRoleId);
    }

    const { success, joke_id } = await Jokes.removeJoke(proposal);
    if (!success) return;

    interaction.client.refreshStatus();

    await prisma.proposal.updateMany({
      data: {
        merged: true,
        joke_id
      },
      where: { id: proposal.suggestion.id }
    });

    embed.color = Colors.ACCEPTED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: "Blague retirée à l'API",
        embeds: [embed]
      });
    }

    embed.footer = { text: 'Blague signalée' };

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      field.value = field.value.match(dataSplitRegex)!.groups!.base;
    } else {
      embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
    }

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    message.client.stickys.reload();

    await interaction.editReply(
      interactionValidate(`La [blague](${message.url}) a bien été signalée et retirée de l'API !`)
    );
  }

  async approveCorrection({ interaction, proposal, message, embed }: ApproveOptions<Correction>): Promise<void> {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;
    const suggestionsChannel = interaction.client.channels.cache.get(suggestionsChannelId) as TextChannel;
    const isPublishedJoke = proposal.type === ProposalType.CORRECTION;
    const suggestionMessage = proposal.suggestion.message_id
      ? await suggestionsChannel.messages.fetch(proposal.suggestion.message_id).catch(() => null)
      : null;

    const member = await interaction.guild?.members.fetch(proposal.user_id!).catch(() => null);
    if (member && !member.roles.cache.has(correctorRoleId)) {
      await member.roles.add(correctorRoleId);
    }

    if (isPublishedJoke) {
      const { success } = await Jokes.mergeJoke(proposal);
      if (!success) return;

      interaction.client.refreshStatus();
    }

    if (suggestionMessage) {
      const diff = compareTwoStrings(
        `${proposal.joke_question} ${proposal.joke_answer}`,
        `${proposal.suggestion.joke_question} ${proposal.suggestion.joke_answer}`
      );
      if (diff > 0.5) {
        await suggestionMessage.reactions.removeAll();
        for (const reaction of [upReactionIdentifier, downReactionIdentifier]) {
          await suggestionMessage.react(reaction).catch(() => null);
        }
      }
    }

    await prisma.proposal.update({
      data: {
        merged: true,
        suggestion: {
          update: {
            joke_type: proposal.joke_type,
            joke_question: proposal.joke_question,
            joke_answer: proposal.joke_answer
          }
        }
      },
      where: { id: proposal.id }
    });

    for (const correction of proposal.suggestion.corrections) {
      if (correction.id === proposal.id) continue;
      if (correction.merged || correction.refused) continue;

      await prisma.proposal.update({
        data: { stale: true },
        where: { id: correction.id }
      });
      const message =
        correction.message_id && (await suggestionsChannel.messages.fetch(correction.message_id).catch(() => null));
      if (message) {
        const staleEmbed = message.embeds[0]?.toJSON();
        if (staleEmbed?.fields) {
          staleEmbed.fields[1].value = staleEmbed.fields[1].value.match(dataSplitRegex)!.groups!.base;
          staleEmbed.footer = { text: `Correction obsolète` };
          staleEmbed.color = Colors.REPLACED;

          await message.edit({ embeds: [staleEmbed] });
        }
      }
    }

    embed.color = Colors.ACCEPTED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: `${isPublishedJoke ? 'Blague' : 'Suggestion'} corrigée`,
        embeds: [embed]
      });
    }

    embed.fields![1].value = embed.fields![1].value.match(dataSplitRegex)!.groups!.base;
    embed.footer = { text: `Correction migrée vers la ${isPublishedJoke ? 'blague' : 'suggestion'}` };

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    if (suggestionMessage) {
      const godfathers = await renderGodfatherLine(interaction, proposal.suggestion);

      await suggestionMessage.edit({
        embeds: [
          {
            ...suggestionMessage.embeds[0].toJSON(),
            description: stripIndents`
              > **Type**: ${CategoriesRefs[proposal.joke_type as Category]}
              > **Blague**: ${proposal.joke_question}
              > **Réponse**: ${proposal.joke_answer}

              ${godfathers}
            `
          }
        ]
      });
    }
    await interaction.editReply(
      interactionValidate(
        `La [correction](${message.url}) a bien été migrée vers la ${isPublishedJoke ? 'blague' : 'suggestion'}!`
      )
    );

    if (
      suggestionMessage &&
      proposal.suggestion &&
      proposal.suggestion.approvals.length >= neededSuggestionsApprovals
    ) {
      await this.approveSuggestion({
        interaction,
        proposal: proposal.suggestion,
        message: suggestionMessage,
        embed: suggestionMessage.embeds[0].toJSON(),
        automerge: true
      });
    }
  }
}
