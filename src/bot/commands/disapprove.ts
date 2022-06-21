import { Proposal, ProposalType } from '@prisma/client';
import {
  APIEmbed,
  ApplicationCommandType,
  Message,
  MessageContextMenuCommandInteraction,
  TextChannel
} from 'discord.js';
import prisma from '../../prisma';
import {
  Colors,
  correctionsChannelId,
  godfatherRoleId,
  logsChannelId,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  suggestionsChannelId
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

export default class DisapproveCommand extends Command {
  constructor() {
    super({
      name: 'Désapprouver',
      type: ApplicationCommandType.Message
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestionsChannelId;
    const message = await channel.messages.fetch(interaction.targetId);
    if (![suggestionsChannelId, correctionsChannelId].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver une blague ou une correction en dehors des salons <#${suggestionsChannelId}> et <#${correctionsChannelId}>.`
        )
      );
    }
    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver une ${isSuggestion ? 'blague' : 'correction'} qui n'est pas gérée par ${
            interaction.client.user
          }.`
        )
      );
    }

    if (!isParrain(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un <@${godfatherRoleId}> peut désapprouver une ${isSuggestion ? 'blague' : 'correction'}.`
        )
      );
    }

    const proposal = await prisma.proposal.findUnique({
      where: {
        message_id: message.id
      },
      include: {
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
        suggestion: {
          include: {
            corrections: {
              take: 1,
              orderBy: {
                created_at: 'desc'
              },
              where: {
                merged: false,
                refused: false,
                stale: false
              }
            }
          }
        },
        disapprovals: true,
        approvals: true
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

    if (proposal.merged) {
      return interaction.reply(
        interactionProblem(`Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été ajoutée.`)
      );
    }

    if (proposal.refused) {
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
          `Il semblerait qu'une [correction ai été proposée](${correctionLink}), veuillez la cloturer avant la désapprobation de [cette suggestion](${suggestionLink}).`
        )
      );
    }

    const lastCorrection = !isSuggestion && proposal.suggestion?.corrections[0];
    if (lastCorrection && lastCorrection.id !== proposal.id) {
      const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, lastCorrection.message_id!);
      return interaction.reply(
        interactionInfo(`
          Il semblerait qu'une [correction ai été ajoutée](${correctionLink}) par dessus rendant celle ci obsolète, veuillez désapprouver la dernière version de la correction.`)
      );
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

      const godfathers = await renderGodfatherLine(interaction, proposal);

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = `${field.value.split('\n\n')[0]}\n\n${godfathers}`;
      } else {
        embed.description = `${embed.description!.split('\n\n')[0]}\n\n${godfathers}`;
      }

      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionInfo(`Votre désapprobation a bien été retirée.`));
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
    }

    proposal.disapprovals.push(
      await prisma.disapproval.create({
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

    if (proposal.disapprovals.length < neededApprovals) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionValidate(`Votre [désapprobation](${message.url}) a été prise en compte !`));
    }

    return this.disapprove(interaction, proposal, message, embed);
  }

  async disapprove(
    interaction: MessageContextMenuCommandInteraction,
    proposal: Proposal,
    message: Message,
    embed: APIEmbed
  ) {
    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;
    const isSuggestion = proposal.type === ProposalType.SUGGESTION;

    await prisma.proposal.update({
      data: { refused: true },
      where: { id: proposal.id }
    });

    embed.color = Colors.REFUSED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: `${isSuggestion ? 'Blague' : 'Suggestion'} refusée`,
        embeds: [embed]
      });
    }

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      field.value = field.value.split('\n\n')[0];
    } else {
      embed.description = embed.description!.split('\n\n')[0];
    }

    embed.footer = {
      text: `${isSuggestion ? 'Suggestion' : 'Correction'} refusée`
    };

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    await message.reactions.removeAll();

    return interaction.reply(
      interactionValidate(`La [${isSuggestion ? 'suggestion' : 'correction'}](${message.url}) a bien été refusée !`)
    );
  }
}
