import { Proposal, ProposalType } from '@prisma/client';
import { stripIndents } from 'common-tags';
import {
  CommandInteraction,
  ContextMenuInteraction,
  Message,
  MessageEmbed,
  MessageEmbedOptions,
  TextChannel
} from 'discord.js';
import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import prisma from '../../prisma';
import { CategoriesRefs, Category, Joke } from '../../typings';
import {
  correctionChannel,
  neededApprovals,
  suggestsChannel
} from '../constants';
import Command from '../lib/command';
import {
  interactionError,
  interactionInfo,
  interactionValidate
} from '../utils';

type Correction = Proposal & {
  suggestion: Proposal;
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
    const isSuggestion = channel.id === suggestsChannel;
    const message = await channel.messages.fetch(
      (interaction as ContextMenuInteraction).targetId
    );
    if (![suggestsChannel, correctionChannel].includes(channel.id)) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez pas approuver une blague ou une correction en dehors des salons <#${suggestsChannel}> et <#${correctionChannel}>.`
        )
      );
    }
    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez pas approuver une ${
            isSuggestion ? 'blague' : 'correction'
          } qui n'est pas gérée par ${interaction.client.user}.`
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
            merged: false
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
                merged: false
              }
            }
          }
        },
        approvals: true
      }
    });

    if (!proposal) {
      return interaction.reply(interactionError(`Le message est invalide.`));
    }

    const embed = message.embeds[0];
    if (!embed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      return interaction.reply(interactionError(`Le message est invalide.`));
    }

    if (proposal.user_id === interaction.user.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez pas approuver votre propre ${
            isSuggestion ? 'blague' : 'correction'
          }.`
        )
      );
    }

    if (proposal.merged) {
      return interaction.reply(
        interactionError(
          `Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été ajoutée.`
        )
      );
    }

    const correction =
      proposal.type === ProposalType.SUGGESTION && proposal.corrections[0];
    if (correction && !correction.merged) {
      return interaction.reply(
        interactionInfo(
          `Il semblerait qu'une [correction ai été proposée](https://discord.com/channels/${
            interaction.guild!.id
          }/${correctionChannel}/${
            correction.message_id
          }), veuillez l'approuver avant l'approbation de cette suggestion.`
        )
      );
    }

    const lastCorrection =
      proposal.type !== ProposalType.SUGGESTION &&
      proposal.suggestion!.corrections[0];
    if (lastCorrection && lastCorrection.id !== proposal.id) {
      return interaction.reply(
        interactionInfo(`
          Il semblerait qu'une [correction ai été ajoutée](https://discord.com/channels/${
            interaction.guild!.id
          }/${correctionChannel}/${
          lastCorrection.message_id
        }) par dessus rendant celle ci obselette, veuillez approuver la dernière version de la correction.`)
      );
    }

    if (
      proposal.approvals.some(
        (approval) => approval.user_id === interaction.user.id
      )
    ) {
      return interaction.reply(
        interactionInfo(
          `Vous avez déjà approuvé cette ${
            isSuggestion ? 'blague' : 'correction'
          }.`
        )
      );
    }

    await prisma.approval.create({
      data: {
        proposal_id: proposal.id,
        user_id: interaction.user.id
      }
    });

    if (proposal.approvals.length < neededApprovals - 1) {
      const missingApprovals = neededApprovals - 1 - proposal.approvals.length;
      embed.footer!.text = `${missingApprovals} approbation${
        missingApprovals > 1 ? 's' : ''
      } manquantes avant l'ajout`;

      await message.edit({ embeds: [embed] });

      return interaction.reply(
        interactionValidate(`Votre approbation a été prise en compte !`)
      );
    }

    return proposal.type === ProposalType.SUGGESTION
      ? this.approveSuggestion(interaction, proposal, message, embed)
      : this.approveCorrection(
          interaction,
          proposal as Correction,
          message,
          embed
        );
  }

  async approveSuggestion(
    interaction: CommandInteraction,
    proposal: Proposal,
    message: Message,
    embed: MessageEmbed
  ): Promise<void> {
    const { success, joke_id } = await this.mergeJoke(interaction, proposal);
    if (!success) return;

    await prisma.proposal.updateMany({
      data: {
        merged: true,
        joke_id
      },
      where: { id: proposal.id }
    });

    embed.color = 0x00ff00;
    embed.footer!.text = 'Blague ajoutée';

    await message.edit({ embeds: [embed] });

    return interaction.reply(
      interactionValidate(`La suggestion a bien été ajoutée à l'API !`)
    );
  }

  async approveCorrection(
    interaction: CommandInteraction,
    proposal: Correction,
    message: Message,
    embed: MessageEmbed
  ): Promise<void> {
    const channel = interaction.client.channels.cache.get(
      suggestsChannel
    ) as TextChannel;
    const suggestionMessage =
      proposal.suggestion.message_id &&
      (await channel.messages
        .fetch(proposal.suggestion.message_id)
        .catch(() => null));

    if (proposal.type === ProposalType.CORRECTION) {
      const { success } = await this.mergeJoke(interaction, proposal);
      if (!success) return;
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

    embed.color = 0x00ff00;
    embed.footer!.text = 'Correction migrée vers la suggestion';

    await message.edit({ embeds: [embed] });
    if (suggestionMessage) {
      await suggestionMessage.edit({
        embeds: [
          {
            ...suggestionMessage.embeds[0],
            description: stripIndents`
              > **Type**: ${CategoriesRefs[proposal.joke_type as Category]}
              > **Blague**: ${proposal.joke_question}
              > **Réponse**: ${proposal.joke_answer}
            `
          } as MessageEmbedOptions
        ]
      });
    }
    return interaction.reply(
      interactionValidate(`La correction a bien été migrée vers la blague !`)
    );
  }

  async mergeJoke(
    interaction: CommandInteraction,
    proposal: Proposal
  ): Promise<{ success: boolean; joke_id?: number }> {
    const jokesPath = path.join(__dirname, '../../../blagues.json');
    try {
      await fs.access(jokesPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      console.log('Missing access', error);
      await interaction.reply(
        interactionError(
          `Il semblerait que le fichier de blagues soit inaccessible ou innexistant.`
        )
      );
      return { success: false };
    }

    try {
      const rawData = await fs.readFile(jokesPath, 'utf-8');
      const data = (rawData.length ? JSON.parse(rawData) : []) as Joke[];

      const index =
        proposal.type === 'CORRECTION'
          ? data.findIndex((joke) => joke.id === proposal.joke_id!)
          : data.length;
      const joke_id =
        proposal.type === 'CORRECTION'
          ? proposal.joke_id!
          : data[data.length - 1].id + 1;
      const joke = {
        id: joke_id,
        type: proposal.joke_type,
        joke: proposal.joke_question,
        answer: proposal.joke_answer
      } as Joke;
      data.splice(index, proposal.type === 'CORRECTION' ? 1 : 0, joke);

      await fs.writeFile(jokesPath, JSON.stringify(data, null, 2));

      return { success: true, joke_id };
    } catch (error) {
      console.log('Error:', error);

      await interaction.reply(
        interactionError(
          `Une erreur s'est produite lors de l'ajout de la blague.`
        )
      );
      return { success: false };
    }
  }
}
