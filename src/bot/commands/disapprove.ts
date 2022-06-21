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
  correctionsChannel,
  dataSplitRegex,
  logsChannel,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  suggestionsChannel
} from '../constants';
import Command from '../lib/command';
import { renderGodfatherLine } from '../modules/godfathers';
import { interactionProblem, interactionInfo, interactionValidate, isEmbedable } from '../utils';

export default class DisapproveCommand extends Command {
  constructor() {
    super({
      name: 'Désapprouver',
      type: ApplicationCommandType.Message
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestionsChannel;
    const message = await channel.messages.fetch(interaction.targetId);
    if (![suggestionsChannel, correctionsChannel].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas désapprouver une blague ou une correction en dehors des salons <#${suggestionsChannel}> et <#${correctionsChannel}>.`
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
      return interaction.reply(
        interactionInfo(
          `Il semblerait qu'une [correction aie été proposée](https://discord.com/channels/${interaction.guild.id}/${correctionsChannel}/${correction.message_id}), veuillez la cloturer avant la désapprobation de [cette suggestion](https://discord.com/channels/${interaction.guild.id}/${suggestionsChannel}/${proposal.message_id}).`
        )
      );
    }

    const lastCorrection = !isSuggestion && proposal.suggestion?.corrections[0];
    if (lastCorrection && lastCorrection.id !== proposal.id) {
      return interaction.reply(
        interactionInfo(`
          Il semblerait qu'une [correction aie été ajoutée](https://discord.com/channels/${interaction.guild.id}/${correctionsChannel}/${lastCorrection.message_id}) par dessus rendant celle ci obsolète, veuillez désapprouver la dernière version de la correction.`)
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

    const godfathers = await renderGodfatherLine(interaction, proposal);

    const field = embed.fields?.[embed.fields.length - 1];
    if (field) {
      const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
      field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
    } else {
      const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
      embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
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
    const logs = interaction.client.channels.cache.get(logsChannel) as TextChannel;
    const isSuggestion = proposal.type === ProposalType.SUGGESTION;

    await prisma.proposal.update({
      data: { refused: true },
      where: { id: proposal.id }
    });

    embed.color = Colors.REFUSED;

    if (isEmbedable(logs)) {
      await logs.send({
        content: `${isSuggestion ? 'Blague' : 'Suggestion'} refusée`,
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

    await message.edit({ embeds: [embed] });

    await message.reactions.removeAll();

    return interaction.reply(
      interactionValidate(`La [${isSuggestion ? 'suggestion' : 'correction'}](${message.url}) a bien été refusée !`)
    );
  }
}
