import { Proposal, ProposalType, Approval, Disapproval } from '@prisma/client';
import { stripIndents } from 'common-tags';
import {
  CommandInteraction,
  ContextMenuInteraction,
  Message,
  MessageEmbed,
  MessageEmbedOptions,
  TextChannel
} from 'discord.js';
import prisma from '../../prisma';
import { CategoriesRefs, Category } from '../../typings';
import {
  correctionsChannel,
  suggestionsChannel,
  neededApprovals,
  upReaction,
  downReaction,
  logsChannel
} from '../constants';
import Command from '../lib/command';
import { renderGodfatherLine } from '../modules/godfathers';
import { interactionProblem, interactionInfo, interactionValidate, isEmbedable } from '../utils';
import Jokes from '../../jokes';
import { compareTwoStrings } from 'string-similarity';

type Correction = Proposal & {
  suggestion: Proposal & {
    corrections: Proposal[];
    approvals: Approval[];
    disapprovals: Disapproval[];
  };
  approvals: Approval[];
  disapprovals: Disapproval[];
};

export default class ApproveCommand extends Command {
  constructor() {
    super({
      name: 'Approuver',
      type: 'MESSAGE',
      parrainOnly: true
    });
  }

  async run(interaction: CommandInteraction): Promise<void> {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestionsChannel;
    const message = await channel.messages.fetch((interaction as ContextMenuInteraction).targetId);
    if (![suggestionsChannel, correctionsChannel].includes(channel.id)) {
      return interaction.reply(
        interactionProblem(
          `Vous ne pouvez pas approuver une blague ou une correction en dehors des salons <#${suggestionsChannel}> et <#${correctionsChannel}>.`
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
    });

    if (!proposal) {
      return interaction.reply(interactionProblem(`Le message est invalide.`));
    }

    const embed = message.embeds[0];
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
      return interaction.reply(
        interactionProblem(`Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été ajoutée.`)
      );
    }

    if (proposal.refused) {
      return interaction.reply(
        interactionProblem(`Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été refusée.`)
      );
    }

    const correction = proposal.type === ProposalType.SUGGESTION && proposal.corrections[0];
    if (correction) {
      return interaction.reply(
        interactionInfo(
          `Il semblerait qu'une [correction ai été proposée](https://discord.com/channels/${
            interaction.guild!.id
          }/${correctionsChannel}/${
            correction.message_id
          }), veuillez l'approuver avant l'approbation de cette suggestion.`
        )
      );
    }

    const lastCorrection = proposal.type !== ProposalType.SUGGESTION && proposal.suggestion?.corrections[0];
    if (lastCorrection && lastCorrection.id !== proposal.id) {
      return interaction.reply(
        interactionInfo(`
          Il semblerait qu'une [correction ai été ajoutée](https://discord.com/channels/${
            interaction.guild!.id
          }/${correctionsChannel}/${
          lastCorrection.message_id
        }) par dessus rendant celle-ci obsolète, veuillez approuver la dernière version de la correction.`)
      );
    }

    if (proposal.approvals.some((approval) => approval.user_id === interaction.user.id)) {
      return interaction.reply(
        interactionInfo(`Vous avez déjà approuvé cette ${isSuggestion ? 'blague' : 'correction'}.`)
      );
    }

    const disapprovalIndex = proposal.disapprovals.findIndex(
      (disapproval) => disapproval.user_id === interaction.user.id
    );
    if (disapprovalIndex !== -1) {
      proposal.disapprovals.splice(disapprovalIndex, 1);
      await prisma.disapproval.delete({
        where: {
          proposal_id_user_id: {
            proposal_id: proposal.id,
            user_id: interaction.user.id
          }
        }
      });
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

    if (proposal.approvals.length < neededApprovals) {
      await message.edit({ embeds: [embed] });

      return interaction.reply(interactionValidate(`Votre [approbation](${message.url}) a été prise en compte !`));
    }

    await interaction.deferReply();

    return proposal.type === ProposalType.SUGGESTION
      ? this.approveSuggestion(interaction, proposal, message, embed)
      : this.approveCorrection(interaction, proposal as Correction, message, embed);
  }

  async approveSuggestion(
    interaction: CommandInteraction,
    proposal: Proposal,
    message: Message,
    embed: MessageEmbed
  ): Promise<void> {
    const logs = interaction.client.channels.cache.get(logsChannel) as TextChannel;

    const { success, joke_id } = await Jokes.mergeJoke(proposal);
    if (!success) return;

    interaction.client.refreshStatus();

    await prisma.proposal.update({
      data: {
        merged: true,
        joke_id
      },
      where: { id: proposal.id }
    });

    embed.color = 0x00ff00;

    await logs.send({
      content: "Blague ajoutée à l'API",
      embeds: [embed.setColor(0x245f8d)]
    });

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
    interaction: CommandInteraction,
    proposal: Correction,
    message: Message,
    embed: MessageEmbed
  ): Promise<void> {
    const logs = interaction.client.channels.cache.get(logsChannel) as TextChannel;
    const channel = interaction.client.channels.cache.get(suggestionsChannel) as TextChannel;
    const isPublishedJoke = proposal.type === ProposalType.CORRECTION;
    const suggestionMessage =
      proposal.suggestion.message_id &&
      (await channel.messages.fetch(proposal.suggestion.message_id).catch(() => null));

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
      const message = correction.message_id && (await channel.messages.fetch(correction.message_id).catch(() => null));
      if (message) {
        const staleEmbed = message.embeds[0];
        staleEmbed.fields[1].value = staleEmbed.fields[1].value!.split('\n\n')[0];
        staleEmbed.footer = {
          text: `Correction obsolète`
        };
        staleEmbed.color = 0xbcbcbc;
        await message.edit({ embeds: [staleEmbed] });
      }
    }

    embed.color = 0x00ff00;

    if (isEmbedable(logs)) {
      await logs.send({
        content: `${isPublishedJoke ? 'Blague' : 'Suggestion'} corrigée`,
        embeds: [embed.setColor(0x245f8d)]
      });
    }

    embed.fields[1].value = embed.fields[1].value!.split('\n\n')[0];
    embed.footer = {
      text: `Correction migrée vers la ${isPublishedJoke ? 'blague' : 'suggestion'}`
    };

    await message.edit({ embeds: [embed] });
    if (suggestionMessage) {
      const godfathers = await renderGodfatherLine(interaction, proposal.suggestion);

      await suggestionMessage.edit({
        embeds: [
          {
            ...suggestionMessage.embeds[0],
            description: stripIndents`
              > **Type**: ${CategoriesRefs[proposal.joke_type as Category]}
              > **Blague**: ${proposal.joke_question}
              > **Réponse**: ${proposal.joke_answer}

              ${godfathers}
            `
          } as MessageEmbedOptions
        ]
      });
    }
    await interaction.editReply(
      interactionValidate(`La [correction](${message.url}) a bien été migrée vers la blague !`)
    );
  }
}
