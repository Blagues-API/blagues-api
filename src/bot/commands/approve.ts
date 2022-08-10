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
import {
  CategoriesRefs,
  Category,
  Correction,
  Proposals,
  ProposalSuggestion,
  ReportExtended,
  Suggestion
} from '../../typings';
import {
  Colors,
  neededCorrectionsApprovals,
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
  reportsChannelId,
  neededReportsApprovals
} from '../constants';
import Command from '../lib/command';
import {
  interactionProblem,
  interactionInfo,
  interactionValidate,
  isEmbedable,
  messageLink,
  Declaration,
  isGodfather,
  updateProposalEmbed,
  checkProposalStatus
} from '../utils';
import Jokes from '../../jokes';
import { renderGodfatherLine } from '../modules/godfathers';
import { compareTwoStrings } from 'string-similarity';

interface ApproveOptions<T extends Proposals> {
  interaction: MessageContextMenuCommandInteraction<'cached'>;
  proposal: T;
  message: Message;
  embed: APIEmbed;
  automerge?: boolean;
}

interface CollectorOptions {
  interaction: MessageContextMenuCommandInteraction<'cached'>;
  message: Message;
}

export default class ApproveCommand extends Command {
  private readonly collector: Record<
    string,
    (options: CollectorOptions) => Promise<{
      proposal: Proposals;
      embed: APIEmbed;
    } | null>
  >;

  private readonly approve: Record<
    string,
    ({ interaction, proposal, message, embed, automerge }: ApproveOptions<Proposals>) => Promise<void>
  >;

  constructor() {
    super({
      name: 'Approuver',
      type: ApplicationCommandType.Message
    });

    this.collector = {
      [suggestionsChannelId]: this.proposalsCollector,
      [correctionsChannelId]: this.proposalsCollector,
      [reportsChannelId]: this.reportCollector
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
        proposal: response.proposal as never
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

  async proposalsCollector({ interaction, message }: CollectorOptions): Promise<{
    proposal: Exclude<Proposals, ReportExtended>;
    embed: APIEmbed;
  } | null> {
    const proposal = await prisma.proposal.findUnique({
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
            }
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
        disapprovals: true
      }
    });
    if (!proposal) {
      await interaction.reply(interactionProblem(`Le message est invalide.`));
      return null;
    }

    const isSuggestion = proposal.type === ProposalType.SUGGESTION;

    const oldEmbed = message.embeds[0]?.toJSON();
    if (!oldEmbed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      await interaction.reply(interactionProblem(`Le message est invalide.`));
      return null;
    }

    if (proposal.user_id === interaction.user.id) {
      await interaction.reply(
        interactionProblem(`Vous ne pouvez pas approuver votre propre ${Declaration[message.channel.id].WORD}.`)
      );
      return null;
    }

    const check = await checkProposalStatus(interaction, proposal, message);

    if (check) return null;

    if (isSuggestion) {
      const correction = proposal.corrections[0];
      if (correction) {
        const beenApproved = correction.approvals.some((approval) => approval.user_id === interaction.user.id);
        if (!beenApproved) {
          const correctionLink = messageLink(interaction.guild.id, correctionsChannelId, correction.message_id!);
          const suggestionLink = messageLink(interaction.guild.id, suggestionsChannelId, proposal.message_id!);
          await interaction.reply(
            interactionInfo(
              `Il semblerait qu'une [correction aie été proposée](${correctionLink}), veuillez l'approuver avant l'approbation de [cette suggestion](${suggestionLink}).`
            )
          );
          return null;
        }
      }
    } else {
      const lastCorrection = proposal.suggestion?.corrections[0];
      if (lastCorrection && lastCorrection.id !== proposal.id) {
        const correctionLink = messageLink(interaction.guild!.id, correctionsChannelId, lastCorrection.message_id!);
        await interaction.reply(
          interactionInfo(
            `Il semblerait qu'une [correction aie été ajoutée](${correctionLink}) par dessus rendant celle-ci obsolète, veuillez approuver la dernière version de la correction.`
          )
        );
        return null;
      }
    }

    const approvalIndex = proposal.approvals.findIndex((approval) => approval.user_id === interaction.user.id);
    if (approvalIndex === -1) {
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
        const suggestionLink = messageLink(interaction.guild!.id, suggestionsChannelId, proposal.message_id!);
        const correctionLink = messageLink(
          interaction.guild!.id,
          correctionsChannelId,
          proposal.corrections[0].message_id!
        );
        await interaction.reply(
          interactionInfo(`
            Le nombre d'approbations requises pour l'ajout de [cette suggestion](${suggestionLink}) a déjà été atteint, seul [cette correction](${correctionLink}) nécessite encore des approbations.`)
        );
        return null;
      }
      const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

      await interaction.client.votes.deleteUserVotes(message, interaction.user.id);
      if (proposal.approvals.length < neededApprovalsCount) {
        await message.edit({ embeds: [oldEmbed] });

        await interaction.reply(interactionValidate(`Votre [approbation](${message.url}) a été prise en compte !`));
        return null;
      }
      await interaction.deferReply({ ephemeral: true });
      return {
        proposal: proposal,
        embed: embed
      };
    } else {
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
      await interaction.reply(interactionInfo(`Votre [approbation](${message.url}) a bien été retirée.`));
      return null;
    }
  }

  async reportCollector({ interaction, message }: CollectorOptions): Promise<{
    proposal: ReportExtended;
    embed: APIEmbed;
  } | null> {
    const proposal = await prisma.report.findUnique({
      where: {
        message_id: message.id
      },
      include: {
        suggestion: {
          include: {
            corrections: {
              include: {
                approvals: true,
                disapprovals: true
              }
            },
            approvals: true,
            disapprovals: true
          }
        },
        approvals: true,
        disapprovals: true
      }
    });

    if (!proposal) {
      await interaction.reply(interactionProblem(`Le message est invalide.`));
      return null;
    }

    const oldEmbed = message.embeds[0]?.toJSON();
    if (!oldEmbed) {
      await prisma.report.delete({
        where: {
          proposal_id: proposal.proposal_id
        }
      });
      await interaction.reply(interactionProblem(`Le message est invalide.`));
      return null;
    }

    if (proposal.user_id === interaction.user.id) {
      await interaction.reply(
        interactionProblem(`Vous ne pouvez pas approuver votre propre ${Declaration[message.channel.id].WORD}.`)
      );
      return null;
    }

    const check = await checkProposalStatus(interaction, proposal, message);

    if (check) return null;

    const approvalIndex = proposal.approvals.findIndex((approval) => approval.user_id === interaction.user.id);
    if (approvalIndex !== -1) {
      await prisma.report.update({
        where: {
          message_id: message.id
        },
        data: {
          approvals: {
            delete: {
              proposal_id_user_id: {
                user_id: interaction.user.id,
                proposal_id: proposal.proposal_id
              }
            }
          }
        }
      });

      const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

      await message.edit({ embeds: [embed] });

      await interaction.reply(interactionInfo(`Votre [approbation](${message.url}) a bien été retirée.`));
      return null;
    }

    const disapprovalIndex = proposal.disapprovals.findIndex(
      (disapproval) => disapproval.user_id === interaction.user.id
    );

    if (disapprovalIndex !== -1) {
      await prisma.report.update({
        where: {
          message_id: message.id
        },
        data: {
          disapprovals: {
            delete: {
              proposal_id_user_id: {
                user_id: interaction.user.id,
                proposal_id: proposal.proposal_id
              }
            }
          }
        }
      });

      proposal.disapprovals.splice(disapprovalIndex, 1);
    }

    proposal.approvals.push(
      await prisma.report.update({
        where: {
          message_id: message.id
        },
        data: {
          approvals: {
            connect: {
              proposal_id_user_id: {
                proposal_id: proposal.proposal_id,
                user_id: interaction.user.id
              }
            }
          }
        }
      })
    );

    const embed = await updateProposalEmbed(interaction, proposal, oldEmbed);

    await interaction.client.votes.deleteUserVotes(message, interaction.user.id);

    if (proposal.approvals.length < neededReportsApprovals) {
      await message.edit({ embeds: [embed] });

      await interaction.reply(interactionValidate(`Votre [approbation](${message.url}) a été prise en compte !`));
      return null;
    }

    await interaction.deferReply({ ephemeral: true });
    return {
      proposal: proposal,
      embed: embed
    };
  }

  async approveSuggestion({
    interaction,
    proposal,
    message,
    embed,
    automerge
  }: ApproveOptions<Suggestion | ProposalSuggestion>): Promise<void> {
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
