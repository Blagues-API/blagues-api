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
import { CategoriesRefs, Category, Correction, ExtendedProposal, Suggestion } from '../../typings';
import {
  Colors,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  correctionsChannelId,
  suggestionsChannelId,
  logsChannelId,
  jokerRoleId,
  correctorRoleId,
  upReaction,
  downReaction,
  godfatherRoleId
} from '../constants';
import Command from '../lib/command';
import { renderGodfatherLine } from '../modules/godfathers';
import {
  interactionProblem,
  interactionInfo,
  interactionValidate,
  isEmbedable,
  messageLink,
  isParrain
} from '../utils';
import Jokes from '../../jokes';
import { compareTwoStrings } from 'string-similarity';

export default class ApproveCommand extends Command {
  constructor() {
    super({
      name: 'Approuver',
      type: ApplicationCommandType.Message
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestionsChannelId;
    const message = await interaction.channel?.messages.fetch(interaction.targetId);
    if (!message) return;

    if (![suggestionsChannelId, correctionsChannelId].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une blague ou une correction en dehors des salons <#${suggestionsChannelId}> et <#${correctionsChannelId}>.`
        )
      );
    }
    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une ${isSuggestion ? 'blague' : 'correction'} qui n'est pas gérée par ${
            interaction.client.user
          }.`
        )
      );
    }

    if (!isParrain(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seuls un <@${godfatherRoleId}> peut approuver une ${isSuggestion ? 'blague' : 'correction'}.`
        )
      );
    }

    const proposal: ExtendedProposal | null = await prisma.proposal.findUnique({
      where: {
        message_id: message.id
      },
      include: {
        suggestion: {
          include: {
            corrections: {
              orderBy: {
                created_at: 'desc'
              },
              where: {
                merged: false,
                refused: false,
                stale: false
              }
            },
            approvals: true,
            disapprovals: true
          }
        },
        corrections: isSuggestion && {
          take: 1,
          orderBy: {
            created_at: 'desc'
          },
          where: {
            merged: false,
            refused: false,
            stale: false
          }
        },
        approvals: true,
        disapprovals: true
      }
    });

    if (!proposal) {
      return interaction.reply(interactionProblem(`Le message est invalide.`));
    }

    const embed = message.embeds[0]?.toJSON();
    if (!embed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      return interaction.reply(interactionProblem(`Le message est invalide.`));
    }

    if (proposal.user_id === interaction.user.id) {
      return interaction.reply(
        interactionProblem(`Vous ne pouvez pas approuver votre propre ${isSuggestion ? 'blague' : 'correction'}.`)
      );
    }

    if (proposal.merged) {
      if (!embed.footer) {
        embed.color = Colors.ACCEPTED;
        embed.footer = { text: `${isSuggestion ? 'Blague' : 'Correction'} déjà traitée` };

        const field = embed.fields?.[embed.fields.length - 1];
        if (field) {
          field.value = field.value.split('\n\n')[0];
        } else {
          embed.description = embed.description!.split('\n\n')[0];
        }

        await message.edit({ embeds: [embed] });
      }

      return interaction.reply(
        interactionProblem(`Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été ajoutée.`)
      );
    }

    if (proposal.refused) {
      if (!embed.footer) {
        embed.color = Colors.REFUSED;
        embed.footer = { text: `${isSuggestion ? 'Suggestion' : 'Correction'} refusée` };

        const field = embed.fields?.[embed.fields.length - 1];
        if (field) {
          field.value = field.value.split('\n\n')[0];
        } else {
          embed.description = embed.description!.split('\n\n')[0];
        }

        await message.edit({ embeds: [embed] });
      }

      return interaction.reply(
        interactionProblem(`Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été refusée.`)
      );
    }

    const correction = isSuggestion && proposal.corrections[0];
    if (correction) {
      const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, correction.message_id!);
      const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
      return interaction.reply(
        interactionInfo(
          `Il semblerait qu'une [correction ai été proposée](${correctionLink}), veuillez l'approuver avant l'approbation de [cette suggestion](${suggestionLink}).`
        )
      );
    }

    const lastCorrection = !isSuggestion && proposal.suggestion?.corrections[0];
    if (lastCorrection && lastCorrection.id !== proposal.id) {
      const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, lastCorrection.message_id!);
      return interaction.reply(
        interactionInfo(`
          Il semblerait qu'une [correction ai été ajoutée](${correctionLink}) par dessus rendant celle-ci obsolète, veuillez approuver la dernière version de la correction.`)
      );
    }

    const approvalIndex = proposal.approvals.findIndex((approval) => approval.user_id === interaction.user.id);
    if (approvalIndex !== -1) {
      await prisma.approval.delete({
        where: {
          proposal_id_user_id: {
            proposal_id: proposal.id,
            user_id: interaction.user.id
          }
        }
      });

      proposal.approvals.splice(approvalIndex, 1);

      const godfathers = await renderGodfatherLine(interaction, proposal);

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = `${field.value.split('\n\n')[0]}\n\n${godfathers}`;
      } else {
        embed.description = `${embed.description!.split('\n\n')[0]}\n\n${godfathers}`;
      }

      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionInfo(`Votre approbation a bien été retirée.`));
    }

    const disapprovalIndex = proposal.disapprovals.findIndex(
      (disapproval) => disapproval.user_id === interaction.user.id
    );
    if (disapprovalIndex !== -1) {
      await prisma.disapproval.delete({
        where: {
          proposal_id_user_id: {
            proposal_id: proposal.id,
            user_id: interaction.user.id
          }
        }
      });

      proposal.disapprovals.splice(disapprovalIndex, 1);
    }

    proposal.approvals.push(
      await prisma.approval.create({
        data: {
          proposal_id: proposal.id,
          user_id: interaction.user.id
        }
      })
    );

    const godfathers = await renderGodfatherLine(interaction, proposal);

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      field.value = `${field.value.split('\n\n')[0]}\n\n${godfathers}`;
    } else {
      embed.description = `${embed.description!.split('\n\n')[0]}\n\n${godfathers}`;
    }

    const neededApprovals = isSuggestion ? neededSuggestionsApprovals : neededCorrectionsApprovals;

    if (proposal.approvals.length < neededApprovals) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionValidate(`Votre [approbation](${message.url}) a été prise en compte !`));
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (isSuggestion) {
        await this.approveSuggestion(interaction, proposal as Suggestion, message, embed);
      } else {
        await this.approveCorrection(interaction, proposal as Correction, message, embed);
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        interactionProblem(
          `Une erreur s'est produite lors de l'approbation de la [suggestion](${message.url}), veuillez contacter le développeur !`
        )
      );
    }
  }

  async approveSuggestion(
    interaction: MessageContextMenuCommandInteraction,
    proposal: Suggestion,
    message: Message,
    embed: APIEmbed
  ): Promise<void> {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;

    const member = await interaction.guild?.members.fetch(proposal.user_id!).catch(() => null);
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
      field.value = field.value.split('\n\n')[0];
    } else {
      embed.description = embed.description!.split('\n\n')[0];
    }

    await message.edit({ embeds: [embed] });

    await interaction.editReply(interactionValidate(`La [suggestion](${message.url}) a bien été ajoutée à l'API !`));
  }

  async approveCorrection(
    interaction: MessageContextMenuCommandInteraction,
    proposal: Correction,
    message: Message,
    embed: APIEmbed
  ): Promise<void> {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;
    const suggestionsChannel = interaction.client.channels.cache.get(suggestionsChannelId) as TextChannel;
    const isPublishedJoke = proposal.type === ProposalType.CORRECTION;
    const suggestionMessage =
      proposal.suggestion.message_id &&
      (await suggestionsChannel.messages.fetch(proposal.suggestion.message_id).catch(() => null));

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
        for (const reaction of [upReaction, downReaction]) {
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
          staleEmbed.fields[1].value = staleEmbed.fields[1].value.split('\n\n')[0];
          staleEmbed.footer = {
            text: `Correction obsolète`
          };
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

    embed.fields![1].value = embed.fields![1].value.split('\n\n')[0];
    embed.footer = {
      text: `Correction migrée vers la ${isPublishedJoke ? 'blague' : 'suggestion'}`
    };

    await message.edit({ embeds: [embed] });
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
      interactionValidate(`La [correction](${message.url}) a bien été migrée vers la blague !`)
    );
  }
}
