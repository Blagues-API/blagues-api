import { stripIndents } from 'common-tags';
import { CommandInteraction, GuildMember, APIEmbed } from 'discord.js';
import { Colors, godfatherRoleId } from '../constants';
import { paginate } from '../utils';
import prisma from '../../prisma';
import chunk from 'lodash/chunk';
import partition from 'lodash/partition';
import { ProposalType, VoteType } from '@prisma/client';

export default class Stats {
  static async userStats(interaction: CommandInteraction<'cached'>, member: GuildMember, ephemeral: boolean) {
    const proposals = await prisma.proposal.findMany({
      where: {
        user_id: member.id,
        stale: false
      }
    });

    const [suggestions, corrections] = partition(proposals, (proposal) => proposal.type === ProposalType.SUGGESTION);
    const fields = [
      {
        name: 'Suggestions :',
        value: stripIndents`
          Proposées: **${suggestions.length}**
          En attente: **${suggestions.filter((s) => !s.refused && !s.merged).length}**
          Acceptées: **${suggestions.filter((s) => s.merged).length}**
        `,
        inline: true
      },
      {
        name: 'Corrections :',
        value: stripIndents`
          Proposées: **${corrections.length}**
          En attente: **${corrections.filter((s) => !s.refused && !s.merged).length}**
          Acceptées: **${corrections.filter((s) => s.merged).length}**
        `,
        inline: true
      }
    ];

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
      membersProposals.map((proposal) => `<@${proposal.user_id}> : ${this.getPoints(interaction.member)}}`),
      20
    ).map((entries) => entries.join('\n'));

    const embed: APIEmbed = {
      title: 'Statistiques',
      description: pages[0] || "Il n'y a aucune statistiques.",
      color: Colors.PRIMARY,
      footer: {
        text: pages.length > 1 ? `Page 1/${pages.length} • Blagues-API` : 'Blagues-API',
        icon_url: interaction.guild!.iconURL({ size: 32 }) ?? undefined
      }
    };

    return paginate(interaction, embed, pages);
  }

  static async getPoints(member: GuildMember): Promise<number> {
    const proposals = await prisma.proposal.findMany({
      where: {
        user_id: member.id,
        stale: false
      }
    });

    const [suggestions, corrections] = partition(proposals, (proposal) => proposal.type === ProposalType.SUGGESTION);

    let userPoints = 0;

    for (const suggestion of suggestions) {
      if (suggestion.merged) userPoints += 10;

      const approvals = await prisma.approval.findMany({
        where: { proposal_id: suggestion.id },
        include: { proposal: true }
      });
      userPoints += approvals.length * 2;

      const disapproval = await prisma.disapproval.findMany({
        where: { proposal_id: suggestion.id },
        include: { proposal: true }
      });
      userPoints += disapproval.length * -2;

      const votes = await prisma.vote.findMany({
        where: { proposal_id: suggestion.id }
      });
      const [vote_up, vote_down] = partition(votes, (vote) => vote.type === VoteType.UP);
      userPoints += vote_up.length * 1;
      userPoints += vote_down.length * -1;
    }
    for (const correction of corrections) {
      if (correction.merged) userPoints += 7;

      const approvals = await prisma.approval.findMany({
        where: { proposal_id: correction.id },
        include: { proposal: true }
      });
      userPoints += approvals.length * 2;

      const disapproval = await prisma.disapproval.findMany({
        where: { proposal_id: correction.id },
        include: { proposal: true }
      });
      userPoints += disapproval.length * -2;

      const votes = await prisma.vote.findMany({
        where: { proposal_id: correction.id }
      });
      const [vote_up, vote_down] = partition(votes, (vote) => vote.type === VoteType.UP);
      userPoints += vote_up.length * 1;
      userPoints += vote_down.length * -1;
    }

    if (member.roles.cache.has(godfatherRoleId)) {
      const approvals = await prisma.approval.findMany({
        where: {
          user_id: member.id
        }
      });
      const disapprovals = await prisma.disapproval.findMany({
        where: {
          user_id: member.id
        }
      });

      userPoints += approvals.length * 4;
      userPoints += disapprovals.length * 4;
    }

    if (!member.roles.cache.has(godfatherRoleId)) {
      const votes = await prisma.vote.findMany({
        where: { user_id: member.id }
      });

      userPoints += votes.length * 2;
    }

    return userPoints;
  }
}
