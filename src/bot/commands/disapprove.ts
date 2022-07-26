import { ProposalType } from '@prisma/client';
import {
  APIEmbed,
  ApplicationCommandType,
  Message,
  MessageContextMenuCommandInteraction,
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
  reportsChannelId,
  suggestionsChannelId
} from '../constants';
import Command from '../lib/command';
import { renderGodfatherLine } from '../modules/godfathers';
import {
  interactionInfo,
  interactionProblem,
  interactionValidate,
  isEmbedable,
  isParrain,
  messageLink,
  Declaration
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
    const message = await channel.messages.fetch(interaction.targetId);

    if (![suggestionsChannelId, correctionsChannelId, reportsChannelId].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver une blague, une correction ou un signalement en dehors des salons <#${suggestionsChannelId}>, <#${correctionsChannelId}> et <"${reportsChannelId}>.`
        )
      );
    }
    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver ${
            Declaration[channel.id].WITH_UNDEFINED_ARTICLE
          } qui n'est pas gérée par ${interaction.client.user}.`
        )
      );
    }

    if (!isParrain(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un <@${godfatherRoleId}> peut désapprouver ${Declaration[channel.id].WITH_UNDEFINED_ARTICLE}.`
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
            approvals: true,
            disapprovals: true
          }
        },
        report: {
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
        approvals: true,
        disapprovals: true
      }
    })) as Proposals | null;

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

    const isSuggestion = proposal.type === ProposalType.SUGGESTION;
    const isReport = proposal.type === ProposalType.REPORT;

    if (proposal.merged) {
      return interaction.reply(
        interactionProblem(`${Declaration[channel.id].WITH_DEMONSTRATIVE_DETERMINANT} a déjà été ajouté${isReport ? '' : 'e'}.`)
      );
    }

    if (proposal.refused) {
      return interaction.reply(
        interactionProblem(`${Declaration[channel.id].WITH_DEMONSTRATIVE_DETERMINANT} a déjà été refusé${isReport ? '' : 'e'}.`)
      );
    }

    if (isSuggestion) {
      const correction = proposal.corrections[0];
      if (correction) {
        const beenDisapproved = correction.disapprovals.some(
          (disapproval) => disapproval.user_id === interaction.user.id
        );
        if (!beenDisapproved) {
          const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, correction.message_id!);
          const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
          return interaction.reply(
            interactionInfo(
              `Il semblerait qu'une [correction aie été proposée](${correctionLink}), veuillez la désapprouver avant la désapprobation de [cette suggestion](${suggestionLink}).`
            )
          );
        }
      }
    } else if (!isReport) {
      const lastCorrection = proposal.suggestion?.corrections[0];
      if (lastCorrection && lastCorrection.id !== proposal.id) {
        const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, lastCorrection.message_id!);
        return interaction.reply(
          interactionInfo(`
            Il semblerait qu'une [correction aie été ajoutée](${correctionLink}) par dessus rendant celle ci obsolète, veuillez désapprouver la dernière version de la correction.`)
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

      const godfathers = await renderGodfatherLine(interaction, proposal);

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
        field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
      } else {
        const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
        embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
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

    const neededApprovalsCount = isSuggestion ? neededSuggestionsApprovals : neededCorrectionsApprovals;

    if (isSuggestion && proposal.disapprovals.length >= neededApprovalsCount && proposal.corrections[0]) {
      const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
      const correctionLink = messageLink(
        interaction.guild.id,
        correctionsChannelId,
        proposal.corrections[0].message_id!
      );
      return interaction.reply(
        interactionInfo(`
          Le nombre de désapprobations requises pour le refus de [cette suggestion](${suggestionLink}) a déjà été atteint, seul [cette correction](${correctionLink}) nécessite encore des désapprobations.`)
      );
    }

    const godfathers = await renderGodfatherLine(interaction, proposal);

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
      field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
    } else {
      const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
      embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
    }

    if (proposal.disapprovals.length < neededApprovalsCount) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionValidate(`Votre [désapprobation](${message.url}) a été prise en compte !`));
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
    const isReport = proposal.type === ProposalType.REPORT;

    await prisma.proposal.update({
      data: { refused: true },
      where: { id: proposal.id }
    });

    embed.color = Colors.REFUSED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: `${Declaration[interaction.channel!.id].WORD_CAPITALIZED} refusé${isReport ? '' : 'e'}`,
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
      text: `${Declaration[interaction.channel!.id].WORD_CAPITALIZED} refusé${isReport ? '' : 'e'}`
    };

    const jokeMessage = await message.edit({ embeds: [embed] });
    await jokeMessage.reactions.removeAll();

    if (proposal.type === ProposalType.CORRECTION) {
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
          `La [suggestion](${message.url}) a bien été automatiquement désapprouvée suite à la désapprobation manquante sur la correction !`
        )
      );
      return;
    }

    await message.reactions.removeAll();

    await interaction.reply(
      interactionValidate(`L${isReport ? 'e' : 'a'} [${Declaration[interaction.channel!.id].WORD}](${message.url}) a bien été refusé${isReport ? '' : 'e'} !`)
    );
  }
}
