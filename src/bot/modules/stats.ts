import { stripIndents } from 'common-tags';
import { CommandInteraction, GuildMember, APIEmbed, APIEmbedField } from 'discord.js';
import { Colors, godfatherRoleId } from '../constants';
import prisma from '../../prisma';
import { interactionProblem, paginate } from '../utils';
import chunk from 'lodash/chunk';
import partition from 'lodash/partition';
import { Proposal, ProposalType } from '@prisma/client';

export default class Stats {
  static async userStats(interaction: CommandInteraction<'cached'>, ephemeral: boolean) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply(interactionProblem("Cet utilisateur n'est plus présent sur le serveur."));

    const proposals = await prisma.proposal.findMany({
      where: {
        user_id: member.id,
        stale: false
      }
    });

    const fields = [proposalField(member, 'suggestions', proposals), proposalField(member, 'corrections', proposals)];

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
        `,
        inline: true
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

function proposalField(member: GuildMember, proposalType: string, proposals: Proposal[]): APIEmbedField {
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
    `,
    inline: true
  };
}
