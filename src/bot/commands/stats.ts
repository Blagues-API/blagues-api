import { stripIndents } from 'common-tags';
import { CommandInteraction, GuildMember } from 'discord.js';
import { parrainRole } from '../constants';
import Command from '../lib/command';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';
import { interactionProblem } from '../utils';
import partition from 'lodash/partition';

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'stats',
      description: 'Voir les statistiques',
      type: 'CHAT_INPUT',
      options: [
        {
          type: 'USER',
          name: 'user',
          description: 'Utilisateur dont vous voulez les statistiques'
        }
      ]
    });
  }

  async run(interaction: CommandInteraction): Promise<void> {
    if (interaction.options.get('user')) {
      const member = interaction.options.getMember('user') as GuildMember;
      if (!member) return interaction.reply(interactionProblem("Cet utilisateur n'est plus présent sur le serveur."));

      const fields = [];
      const proposals = await prisma.proposal.findMany({
        where: {
          user_id: member.id,
          stale: false
        }
      });

      const [suggestions, corrections] = partition(proposals, (proposal) => proposal.type === ProposalType.SUGGESTION);

      fields.push({
        name: 'Statistiques globales',
        value: stripIndents`
          Blagues proposées: **${suggestions.length}**
          Blagues acceptées: **${suggestions.filter((suggestion) => suggestion.merged).length}**

          Corrections proposées: **${corrections.length}**
          Corrections acceptées: **${corrections.filter((correction) => correction.merged).length}**
        `
      });

      if (member.roles.cache.has(parrainRole)) {
        const approvals = await prisma.approval.findMany({
          where: { user_id: member.id },
          include: { proposal: true }
        });
        const disapprovals = await prisma.disapproval.findMany({
          where: { user_id: member.id },
          include: { proposal: true }
        });

        const totalDecisionsCount = approvals.length + disapprovals.length;
        const suggestsDecisionsCount = [...approvals, ...disapprovals].filter(
          (approval) => approval.proposal.type === ProposalType.SUGGESTION
        ).length;

        fields.push({
          name: 'Décisions de Parrain',
          value: stripIndents`
            Décisions: **${totalDecisionsCount}**

            Blagues: **${suggestsDecisionsCount}**
            Corrections: **${totalDecisionsCount - suggestsDecisionsCount}**
          `
        });
      }

      return interaction.reply({
        embeds: [
          {
            author: {
              icon_url: member.displayAvatarURL({ dynamic: true, size: 32 }),
              name: `Statistiques de ${member.displayName}`
            },
            fields,
            color: 0x0067ad,
            footer: {
              text: 'Blagues API',
              icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
            }
          }
        ]
      });
    }

    const proposals = await prisma.proposal.groupBy({
      by: ['user_id'],
      having: {
        user_id: {
          not: null
        }
      },
      _count: {
        merged: true,
        _all: true
      }
    });

    return interaction.reply({
      embeds: [
        {
          title: 'Statistiques',
          description: proposals
            .sort((a, b) => b._count._all - a._count._all)
            .map((proposal) => `<@${proposal.user_id}>: ${proposal._count.merged}/${proposal._count._all}`)
            .join('\n'),
          color: 0x0067ad,
          footer: {
            text: 'Blagues API',
            icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
          }
        }
      ]
    });
  }
}
