import { Proposal, ProposalType } from '.prisma/client';
import { Snowflake } from 'discord-api-types';
import { Client, Collection } from 'discord.js';
import schedule from 'node-schedule';
import prisma from '../../prisma';
import { parrainRole } from '../constants';

export default class Reminders {
  public client: Client;

  constructor(client: Client) {
    this.client = client;

    schedule.scheduleJob('0 22 */2 * *', async () => {
      await this.run();
    });
  }
  async run() {
    const proposals = await prisma.proposal.findMany({
      include: {
        corrections: {
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

    const guild = this.client.guilds.cache.get(process.env.SERVER_ID!);
    if (!guild) return;

    await guild.members.fetch();

    const role = guild.roles.cache.get(parrainRole);
    if (!role) return;

    const godfathers = new Collection<Snowflake, Proposal[]>();
    for (const member of role.members.values()) {
      const actions: Proposal[] = [];
      for (const proposal of proposals) {
        if (proposal.approvals.some((approval) => approval.user_id === member.id)) continue;
        if (proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id)) continue;

        if (proposal.type === ProposalType.SUGGESTION) {
          if (proposal.corrections[0]) continue;
        } else {
          const lastCorrection = proposal.suggestion?.corrections[0];
          if (lastCorrection && lastCorrection.id !== proposal.id) continue;
        }

        actions.push(proposal);
      }
      if (actions.length) godfathers.set(member.id, actions);
    }

    // TODO: Envoyer le message
  }
}
