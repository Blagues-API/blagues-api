import { stripIndents } from 'common-tags';
import { CommandInteraction, GuildMember, APIEmbedField } from 'discord.js';
import { Colors, godfatherRoleId } from '../constants';
import prisma from 'prisma';
import { interactionProblem } from '../utils';
import { partition } from 'lodash';
import { ProposalType } from '@prisma/client';

export default class Stats {
  static async userStats(interaction: CommandInteraction<'cached'>, ephemeral: boolean) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply(interactionProblem("Cet utilisateur n'est plus présent sur le serveur."));

    const fields = [];
    const proposals = await prisma.proposal.findMany({
      where: {
        user_id: member.id,
        stale: false
      }
    });

    function proposalField(member: GuildMember, proposalType: string): APIEmbedField {
      const [suggestions, corrections] = partition(proposals, (proposal) => proposal.type === ProposalType.SUGGESTION);
      let proposal;

      if (proposalType === 'suggestions') {
        proposal = suggestions;
      } else {
        proposal = corrections;
      }

      return {
        name: 'Suggestions',
        value: stripIndents`
        ${proposal === suggestions ? 'Blagues' : 'Corrections'} proposées: **${proposal.length}**
        ${proposal === suggestions ? 'Blagues' : 'Corrections'} en attente: **${
          proposal.filter((s) => !s.refused && !s.merged).length
        }**
        ${proposal === suggestions ? 'Blagues' : 'Correction'} acceptées: **${proposal.filter((s) => s.merged).length}**
        Up votee: **0** (à venir)
        Down vote: **0** (à venir)
      `
      };
    }

    fields.push(proposalField(member, 'suggestions'));
    fields.push(proposalField(member, 'corrections'));

    if (member.roles.cache.has(godfatherRoleId)) {
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
          Décisions totales: **${totalDecisionsCount}**
          Blagues: **${suggestsDecisionsCount}**
          Corrections: **${totalDecisionsCount - suggestsDecisionsCount}**
        `
      });
    }

    return interaction.reply({
      embeds: [
        {
          author: {
            icon_url: member.displayAvatarURL({ size: 32 }),
            name: `Statistiques de ${member.displayName}`
          },
          fields,
          color: Colors.PRIMARY,
          footer: {
            text: 'Blagues API',
            icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
          }
        }
      ],
      ephemeral: ephemeral
    });
  }

  static async globalStats(interaction: CommandInteraction<'cached'>) {
    // Issue reported: https://github.com/prisma/prisma/issues/10915
    const proposals = await prisma.proposal.groupBy({
      by: ['user_id', 'merged'],
      having: {
        user_id: {
          not: null
        },
        merged: true
      },
      _count: true
    });

    return interaction.reply({
      embeds: [
        {
          title: 'Statistiques',
          description: [...proposals]
            .sort((a, b) => b._count - a._count)
            .map(
              (proposal) => `<@${proposal.user_id}> : ${proposal._count} ${proposal._count !== 1 ? 'points' : 'point'}`
            )
            .join('\n'),
          color: Colors.PRIMARY,
          footer: {
            text: 'Blagues API',
            icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
          }
        }
      ]
    });
  }
}
