import { ProposalType } from '@prisma/client';
import {
  APIEmbed,
  ApplicationCommandType,
  hyperlink,
  Message,
  MessageContextMenuCommandInteraction,
  messageLink,
  roleMention,
  TextChannel
} from 'discord.js';
import { Proposals, ProposalSuggestion } from 'typings';
import prisma from '../../prisma';
import {
  Colors,
  correctionsChannelId,
  dataSplitRegex,
  godfatherRoleId,
  logsChannelId,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  suggestionsChannelId
} from '../constants';
import Command from '../lib/command';
import {
  checkProposalStatus,
  interactionInfo,
  interactionProblem,
  interactionValidate,
  isEmbedable,
  isGodfather,
  updateProposalEmbed
} from '../utils';

export default class DisapproveCommand extends Command {
  constructor() {
    super({
      name: 'Disapprove',
      nameLocalizations: {
        fr: 'Désapprouver'
      },
      type: ApplicationCommandType.Message,
      channels: [suggestionsChannelId, correctionsChannelId]
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestionChannel = channel.id === suggestionsChannelId;
    const message = await channel.messages.fetch(interaction.targetId);

    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver une ${
            isSuggestionChannel ? 'suggestion' : 'correction'
          } qui n'est pas gérée par ${interaction.client.user}.`
        )
      );
    }

    if (!isGodfather(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un ${roleMention(godfatherRoleId)} peut désapprouver une ${
            isSuggestionChannel ? 'suggestion' : 'correction'
          }.`
        )
      );
    }

    const proposal = (await prisma.proposal.findUnique({
      where: {
        message_id: message.id
      },
      include: {
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
            },
            disapprovals: true,
            approvals: true
          }
        },
        corrections: {
          take: 1,
          orderBy: {
            created_at: 'desc'
          },
          where: {
            merged: false,
            refused: false,
            stale: false
          },
          include: {
            disapprovals: true,
            approvals: true
          }
        },
        disapprovals: true,
        approvals: true
      }
    })) as Proposals | null;

    if (!proposal) {
      return interaction.reply(interactionProblem(`Le message est invalide.`));
    }

    const oldEmbed = message.embeds[0]?.toJSON();
    if (!oldEmbed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      return interaction.reply(interactionProblem(`Le message est invalide.`));
    }

    const isSuggestion = proposal.type === ProposalType.SUGGESTION;

    const response = await checkProposalStatus(interaction, proposal, message);

    if (!response) return;

    if (isSuggestion) {
      const correction = proposal.corrections[0];
      if (correction) {
        const beenDisapproved = correction.disapprovals.some(
          (disapproval) => disapproval.user_id === interaction.user.id
        );
        if (!beenDisapproved) {
          const correctionLink = messageLink(correctionsChannelId, correction.message_id!, interaction.guild.id);
          const suggestionLink = messageLink(suggestionsChannelId, proposal.message_id!, interaction.guild.id);
          return interaction.reply(
            interactionInfo(
              `Il semblerait qu'une ${hyperlink(
                'correction aie été proposée',
                correctionLink
              )}, veuillez la désapprouver avant la désapprobation de ${hyperlink('cette suggestion', suggestionLink)}.`
            )
          );
        }
      }
    } else {
      const lastCorrection = proposal.suggestion?.corrections[0];
      if (lastCorrection && lastCorrection.id !== proposal.id) {
        const correctionLink = messageLink(correctionsChannelId, lastCorrection.message_id!, interaction.guild.id);
        return interaction.reply(
          interactionInfo(`
            Il semblerait qu'une ${hyperlink(
              'correction aie été ajoutée',
              correctionLink
            )} par dessus rendant celle ci obsolète, veuillez désapprouver la dernière version de la correction.`)
        );
      }
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

      const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

      await message.edit({ embeds: [embed] });

      return interaction.reply(
        interactionInfo(`Votre ${hyperlink('désapprobation', message.url)} a bien été retirée.`)
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
    }

    proposal.disapprovals.push(
      await prisma.disapproval.create({
        data: {
          proposal_id: proposal.id,
          user_id: interaction.user.id
        }
      })
    );

    const neededApprovalsCount = isSuggestion ? neededSuggestionsApprovals : neededCorrectionsApprovals;

    if (isSuggestion && proposal.disapprovals.length >= neededApprovalsCount && proposal.corrections[0]) {
      const suggestionLink = messageLink(suggestionsChannelId, proposal.message_id!, interaction.guild.id);
      const correctionLink = messageLink(
        correctionsChannelId,
        proposal.corrections[0].message_id!,
        interaction.guild.id
      );
      return interaction.reply(
        interactionInfo(`
          Le nombre de désapprobations requises pour le refus de ${hyperlink(
            'cette suggestion',
            suggestionLink
          )} a déjà été atteint, seule ${hyperlink(
          'cette correction',
          correctionLink
        )} nécessite encore des désapprobations.`)
      );
    }

    const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

    await interaction.client.votes.deleteUserVotes(message, interaction.user.id);

    if (proposal.disapprovals.length < neededApprovalsCount) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(
        interactionValidate(`Votre ${hyperlink('désapprobation', message.url)} a été prise en compte !`)
      );
    }

    return this.disapprove(interaction, proposal, message, embed);
  }

  async disapprove(
    interaction: MessageContextMenuCommandInteraction,
    proposal: Proposals | ProposalSuggestion,
    message: Message,
    embed: APIEmbed,
    automerge = false
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
        content: `${isSuggestion ? 'Suggestion' : 'Correction'} refusée`,
        embeds: [embed]
      });
    }

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      field.value = field.value.match(dataSplitRegex)!.groups!.base;
    } else {
      embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
    }

    embed.footer = {
      text: `${isSuggestion ? 'Suggestion' : 'Correction'} refusée`
    };

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    if (!isSuggestion) {
      const suggestionsChannel = interaction.client.channels.cache.get(suggestionsChannelId) as TextChannel;
      const suggestionMessage = proposal.suggestion?.message_id
        ? await suggestionsChannel.messages.fetch(proposal.suggestion.message_id).catch(() => null)
        : null;

      if (suggestionMessage) {
        const embed = suggestionMessage.embeds[0].toJSON();

        const { base, godfathers } = embed.description!.match(dataSplitRegex)!.groups!;
        embed.description = [base, godfathers].filter(Boolean).join('\n\n');

        await suggestionMessage.edit({ embeds: [embed] });

        if (proposal.suggestion && proposal.suggestion.disapprovals.length >= neededSuggestionsApprovals) {
          await this.disapprove(
            interaction,
            proposal.suggestion,
            suggestionMessage,
            suggestionMessage.embeds[0].toJSON(),
            true
          );
        }
      }
    }

    if (automerge) {
      await interaction.followUp(
        interactionValidate(
          `La ${hyperlink(
            'suggestion',
            message.url
          )} a bien été automatiquement désapprouvée suite à la désapprobation manquante sur la correction !`
        )
      );
      return;
    }

    await message.reactions.removeAll();

    await interaction.reply(
      interactionValidate(
        `La ${hyperlink(isSuggestion ? 'suggestion' : 'correction', message.url)} a bien été refusée !`
      )
    );
  }
}
