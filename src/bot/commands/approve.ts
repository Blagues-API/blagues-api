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
import prisma from '../../prisma';
import { CategoriesRefs, Category, Correction, Proposals, Suggestion } from '../../typings';
import {
  Colors,
  correctionsChannelId,
  correctorRoleId,
  dataSplitRegex,
  downReactionIdentifier,
  godfatherRoleId,
  jokerRoleId,
  logsChannelId,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  suggestionsChannelId,
  upReactionIdentifier
} from '../constants';
import Command from '../lib/command';
import { renderGodfatherLine } from '../modules/godfathers';
import {
  buildJokeDisplay,
  checkProposalStatus,
  interactionInfo,
  interactionProblem,
  interactionValidate,
  isEmbedable,
  isGodfather,
  updateProposalEmbed
} from '../utils';
import Jokes from '../../jokes';
import { compareTwoStrings } from 'string-similarity';

export default class ApproveCommand extends Command {
  constructor() {
    super({
      name: 'Approuver',
      type: ApplicationCommandType.Message,
      channels: [suggestionsChannelId, correctionsChannelId]
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const channel = (interaction.channel as TextChannel)!;

    const message = await interaction.channel?.messages.fetch(interaction.targetId);
    if (!message) return;

    const isSuggestionChannel = channel.id === suggestionsChannelId;

    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une ${
            isSuggestionChannel ? 'suggestion' : 'correction'
          } qui n'est pas gérée par ${interaction.client.user}.`
        )
      );
    }

    if (!isGodfather(interaction.member)) {
      return interaction.reply(
        interactionProblem(
          `Seul un ${roleMention(godfatherRoleId)} peut approuver une ${
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
        approvals: true,
        disapprovals: true,
        votes: true
      }
    })) as Proposals | null;

    if (!proposal) {
      return interaction.reply(interactionProblem('Le message est invalide.'));
    }

    const isSuggestion = proposal.type === ProposalType.SUGGESTION;

    const oldEmbed = message.embeds[0]?.toJSON();
    if (!oldEmbed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      return interaction.reply(interactionProblem('Le message est invalide.'));
    }

    if (proposal.user_id === interaction.user.id) {
      return interaction.reply(
        interactionProblem(`Vous ne pouvez pas approuver votre propre ${isSuggestion ? 'suggestion' : 'correction'}.`)
      );
    }
    const response = await checkProposalStatus(interaction, proposal, message);

    if (!response) return;

    if (isSuggestion) {
      const correction = proposal.corrections[0];
      if (correction) {
        const beenApproved = correction.approvals.some((approval) => approval.user_id === interaction.user.id);
        const beenDisapproved = correction.disapprovals.some(
          (disapproval) => disapproval.user_id === interaction.user.id
        );
        if (!beenApproved && !beenDisapproved) {
          const correctionLink = messageLink(correctionsChannelId, correction.message_id!, interaction.guild.id);
          const suggestionLink = messageLink(suggestionsChannelId, proposal.message_id!, interaction.guild.id);
          return interaction.reply(
            interactionInfo(
              `Il semblerait qu'une ${hyperlink(
                'correction aie été proposée',
                correctionLink
              )}, veuillez l'approuver avant l'approbation de ${hyperlink('cette suggestion', suggestionLink)}.`
            )
          );
        }
      }
    } else {
      const lastCorrection = proposal.suggestion?.corrections[0];
      if (lastCorrection && lastCorrection.id !== proposal.id) {
        const correctionLink = messageLink(correctionsChannelId, lastCorrection.message_id!, interaction.guild.id);
        return interaction.reply(
          interactionInfo(
            `Il semblerait qu'une ${hyperlink(
              'correction aie été ajoutée',
              correctionLink
            )} par dessus rendant celle-ci obsolète, veuillez approuver la dernière version de la correction.`
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

      const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionInfo(`Votre ${hyperlink('approbation', message.url)} a bien été retirée.`));
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

    const neededApprovalsCount = isSuggestion ? neededSuggestionsApprovals : neededCorrectionsApprovals;

    if (isSuggestion && proposal.approvals.length >= neededApprovalsCount && proposal.corrections[0]) {
      const suggestionLink = messageLink(suggestionsChannelId, proposal.message_id!, interaction.guild.id);
      const correctionLink = messageLink(
        correctionsChannelId,
        proposal.corrections[0].message_id!,
        interaction.guild.id
      );
      return interaction.reply(
        interactionInfo(`
          Le nombre d'approbations requises pour l'ajout de ${hyperlink(
            'cette suggestion',
            suggestionLink
          )} a déjà été atteint, seule ${hyperlink(
          'cette correction',
          correctionLink
        )} nécessite encore des approbations.`)
      );
    }

    const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

    await interaction.client.votes.deleteUserVotes(message, interaction.user.id);

    if (proposal.approvals.length < neededApprovalsCount) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(
        interactionValidate(`Votre ${hyperlink('approbation', message.url)} a été prise en compte !`)
      );
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (isSuggestion) {
        return this.approveSuggestion(interaction, proposal, message, embed);
      } else {
        return this.approveCorrection(interaction, proposal, message, embed);
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        interactionProblem(
          `Une erreur s'est produite lors de l'approbation de la ${hyperlink(
            'suggestion',
            message.url
          )}, veuillez contacter le développeur !`
        )
      );
      return;
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

    if (automerge) {
      await interaction.followUp(
        interactionValidate(
          `La ${hyperlink(
            'suggestion',
            message.url
          )} a bien été automatiquement ajoutée à l'API suite à la validation de la correction manquante !`
        )
      );
      return;
    }

    await interaction.editReply(
      interactionValidate(`La ${hyperlink('suggestion', message.url)} a bien été ajoutée à l'API !`)
    );

    return message.client.stickys.reload();
  }

  async approveCorrection(
    interaction: MessageContextMenuCommandInteraction<'cached'>,
    proposal: Correction,
    message: Message,
    embed: APIEmbed
  ): Promise<void> {
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
            description: buildJokeDisplay(
              CategoriesRefs[proposal.joke_type as Category],
              proposal.joke_question!,
              proposal.joke_answer!,
              godfathers
            )
          }
        ]
      });
    }
    await interaction.editReply(
      interactionValidate(
        `La ${hyperlink('correction', message.url)} a bien été migrée vers la ${
          isPublishedJoke ? 'blague' : 'suggestion'
        }!`
      )
    );

    if (
      suggestionMessage &&
      proposal.suggestion &&
      proposal.suggestion.approvals.length >= neededSuggestionsApprovals
    ) {
      await this.approveSuggestion(
        interaction,
        proposal.suggestion as Suggestion,
        suggestionMessage,
        suggestionMessage.embeds[0].toJSON(),
        true
      );
    }
  }
}
