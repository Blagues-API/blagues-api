import { stripIndents } from 'common-tags';
import { ApplicationCommandType, GuildMember, UserContextMenuCommandInteraction } from 'discord.js';
import { Colors, godfatherRoleId } from '../constants';
import Command from '../lib/command';
import prisma from '../../prisma';
import { ProposalType } from '@prisma/client';
import { interactionProblem } from '../utils';
import partition from 'lodash/partition';

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'Statistiques',
      type: ApplicationCommandType.User
    });
  }

  async run(interaction: UserContextMenuCommandInteraction) {
    return this.userStats(interaction);
  }

  async userStats(interaction: UserContextMenuCommandInteraction) {
    const member = interaction.targetUser as unknown as GuildMember;
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
      name: `Statistiques globales`,
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
      ephemeral: true
    });
  }
}
