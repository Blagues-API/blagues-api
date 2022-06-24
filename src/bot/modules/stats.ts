import { stripIndents } from 'common-tags';
import { APIEmbed, CommandInteraction } from 'discord.js';
import { Colors, godfatherRoleId } from '../constants';
import prisma from '../../prisma';
import { interactionProblem, paginate } from '../utils';
import chunk from 'lodash/chunk';
import partition from 'lodash/partition';
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

    const [suggestions, corrections] = partition(proposals, (proposal) => proposal.type === ProposalType.SUGGESTION);

    fields.push({
      name: 'Statistiques globales',
      value: stripIndents`
        Blagues proposées: **${suggestions.length}**
        Blagues en attente: **${suggestions.filter((s) => !s.refused && !s.merged).length}**
        Blagues acceptées: **${suggestions.filter((s) => s.merged).length}**

        Corrections proposées: **${corrections.length}**
        Corrections en attente: **${corrections.filter((c) => !c.refused && !c.merged).length}**
        Corrections acceptées: **${corrections.filter((c) => c.merged).length}**
      `
    });

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

    const membersProposals = proposals
      .filter((proposal) => interaction.guild.members.cache.has(proposal.user_id!))
      .sort((a, b) => b._count - a._count);

    const pages = chunk(
      membersProposals.map(
        (proposal) => `<@${proposal.user_id}> : ${proposal._count} ${proposal._count !== 1 ? 'points' : 'point'}`
      ),
      20
    ).map((entries) => entries.join('\n'));

    const embed: APIEmbed = {
      title: 'Statistiques',
      description: pages[0],
      color: Colors.PRIMARY,
      footer: {
        text: pages.length > 1 ? `Page 1/${pages.length} • Blagues-API` : 'Blagues-API',
        icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
      }
    };

    return paginate(interaction, embed, pages);
  }
}
