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
import { CategoriesRefs, Category, Correction, Proposals, Report, Suggestion } from '../../typings';
import {
  Colors,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  neededReportsApprovals,
  correctionsChannelId,
  suggestionsChannelId,
  logsChannelId,
  jokerRoleId,
  correctorRoleId,
  upReaction,
  downReaction,
  dataSplitRegex,
  godfatherRoleId,
  reportsChannelId
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

    const message = await interaction.channel?.messages.fetch(interaction.targetId);
    if (!message) return;

    if (![suggestionsChannelId, correctionsChannelId, reportsChannelId].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une blague, une correction ou un signalement en dehors des salons <#${suggestionsChannelId}>, <#${correctionsChannelId}> et <"${reportsChannelId}>.`
        )
      );
    }

    type declarationTemplate = {
      WITH_DETERMINANT: string;
      WITHOUT_DETERMINANT: string;
      EMBED_FOOTER_WITH_DETERMINANT: string;
      EMBED_FOOTER_WITHOUT_DETERMINANT: string;
    }

    const Declaration = {
      [suggestionsChannelId]: { WITH_DETERMINANT: 'une blague', WITHOUT_DETERMINANT: 'blague', EMBED_FOOTER_WITH_DETERMINANT: 'Cette blague', EMBED_FOOTER_WITHOUT_DETERMINANT: 'Blague' } as declarationTemplate,
      [correctionsChannelId]: { WITH_DETERMINANT: 'une correction', WITHOUT_DETERMINANT: 'correction', EMBED_FOOTER_WITH_DETERMINANT: 'Cette correction', EMBED_FOOTER_WITHOUT_DETERMINANT: 'Correction' } as declarationTemplate,
      [reportsChannelId]: { WITH_DETERMINANT: 'un signalement', WITHOUT_DETERMINANT: 'signalement', EMBED_FOOTER_WITH_DETERMINANT: 'Ce signalement', EMBED_FOOTER_WITHOUT_DETERMINANT: 'Signalement' } as declarationTemplate,
    }[channel.id];

    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver ${Declaration.WITH_DETERMINANT} qui n'est pas gérée par ${
            interaction.client.user
          }.`
        )
      );
    }

    if (!isParrain(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un <@&${godfatherRoleId}> peut approuver ${Declaration.WITH_DETERMINANT}.`
        )
      )
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

    const isSuggestion = proposal.type === ProposalType.SUGGESTION;
    const isReport = proposal.type === ProposalType.REPORT;

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
        interactionProblem(`Vous ne pouvez pas approuver votre propre ${Declaration.WITHOUT_DETERMINANT}.`)
      );
    }

    if (proposal.merged) {
      if (!embed.footer) {
        embed.color = Colors.ACCEPTED;
        embed.footer = { text: `${Declaration.EMBED_FOOTER_WITHOUT_DETERMINANT} déjà traité${isReport ? '' : 'e'}` };

        const field = embed.fields?.[embed.fields.length - 1];
        if (field) {
          field.value = field.value.match(dataSplitRegex)!.groups!.base;
        } else {
          embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
        }

        await message.edit({ embeds: [embed] });
      }

      return interaction.reply(
        interactionProblem(`${isSuggestion ? 'Cette blague' : isReport ? 'Ce signalement' : 'Cette correction'} a déjà été ajouté${isReport ? '' : 'e'}.`)
      );
    }

    if (proposal.refused) {
      if (!embed.footer) {
        embed.color = Colors.REFUSED;
        embed.footer = { text: `${Declaration.EMBED_FOOTER_WITHOUT_DETERMINANT} refusé${isReport ? '' : 'e'}` };

        const field = embed.fields?.[embed.fields.length - 1];
        if (field) {
          field.value = field.value.match(dataSplitRegex)!.groups!.base;
        } else {
          embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
        }

        await message.edit({ embeds: [embed] });
      }

      return interaction.reply(
        interactionProblem(`${Declaration.EMBED_FOOTER_WITH_DETERMINANT} a déjà été refusé${isReport ? '' : 'e'}.`)
      );
    }

    if (isSuggestion) {
      const correction = proposal.corrections[0];
      if (correction) {
        const beenApproved = correction.approvals.some((approval) => approval.user_id === interaction.user.id);
        if (!beenApproved) {
          const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, correction.message_id!);
          const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
          return interaction.reply(
            interactionInfo(
              `Il semblerait qu'une [correction aie été proposée](${correctionLink}), veuillez l'approuver avant l'approbation de [cette suggestion](${suggestionLink}).`
            )
          );
        }
      }
    } else if (!isReport) {
      const lastCorrection = proposal.suggestion?.corrections[0];
      if (lastCorrection && lastCorrection.id !== proposal.id) {
        const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, lastCorrection.message_id!);
        return interaction.reply(
          interactionInfo(
            `Il semblerait qu'une [correction aie été ajoutée](${correctionLink}) par dessus rendant celle-ci obsolète, veuillez approuver la dernière version de la correction.`
          )
        );
      }
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
        const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
        field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
      } else {
        const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
        embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
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

    const neededApprovalsCount = isSuggestion ? neededSuggestionsApprovals : isReport ? neededReportsApprovals : neededCorrectionsApprovals;

    if (isSuggestion && proposal.approvals.length >= neededApprovalsCount && proposal.corrections[0]) {
      const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
      const correctionLink = messageLink(
        interaction.guild.id,
        correctionsChannelId,
        proposal.corrections[0].message_id!
      );
      return interaction.reply(
        interactionInfo(`
          Le nombre d'approbations requises pour l'ajout de [cette suggestion](${suggestionLink}) a déjà été atteint, seul [cette correction](${correctionLink}) nécessite encore des approbations.`)
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

    if (proposal.approvals.length < neededApprovalsCount) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionValidate(`Votre [approbation](${message.url}) a été prise en compte !`));
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (proposal.type) {
        case ProposalType.SUGGESTION: {
          await this.approveSuggestion(interaction, proposal, message, embed);
          break;
        }
        case ProposalType.REPORT: {
          await this.approveReport(interaction, proposal, message, embed);
          break;
        }
        case ProposalType.CORRECTION: {
          const suggestion = await this.approveCorrection(interaction, proposal, message, embed);

          if (suggestion && proposal.suggestion && proposal.suggestion.approvals.length >= neededSuggestionsApprovals) {
            await this.approveSuggestion(
              interaction,
              proposal.suggestion as Suggestion,
              suggestion,
              suggestion.embeds[0].toJSON(),
              true
            );
          }
          break;
        }
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
    embed: APIEmbed,
    automerge = false
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

  async approveReport(
    interaction: MessageContextMenuCommandInteraction,
    proposal: Report,
    message: Message,
    embed: APIEmbed,
  ): Promise<void> {
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
      where: { id: proposal.id }
    });

    embed.color = Colors.ACCEPTED;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: "Blague ajoutée à l'API",
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

    await interaction.editReply(interactionValidate(`La [blague](${message.url}) a bien été signalée et retirée de l'API !`));
  }

  async approveCorrection(
    interaction: MessageContextMenuCommandInteraction<'cached'>,
    proposal: Correction,
    message: Message,
    embed: APIEmbed
  ) {
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
      interactionValidate(`La [correction](${message.url}) a bien été migrée vers la blague !`)
    );

    return suggestionMessage;
  }
}
