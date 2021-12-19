import { Proposal, ProposalType } from '@prisma/client';
import { Snowflake } from 'discord-api-types';
import { Client, Collection, TextChannel } from 'discord.js';
import schedule from 'node-schedule';
import prisma from '../../prisma';
import {
  correctionsChannel,
  suggestionsChannel,
  remindersChannel,
  guildId,
  emojisGuildId,
  parrainRole
} from '../constants';
import { getGodfatherEmoji } from './godfathers';

export default class Reminders {
  public client: Client;

  constructor(client: Client) {
    this.client = client;

    // Every two days at 9 p.m. (0 21 */2 * *)
    schedule.scheduleJob('0 13 * * *', async () => {
      await this.run();
    });
  }

  async run() {
    // Get all open proposals with their dependencies and decisions
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
            approvals: true,
            disapprovals: true
          }
        },
        approvals: true,
        disapprovals: true
      }
    });

    const guild = this.client.guilds.cache.get(guildId);
    const emojisGuild = this.client.guilds.cache.get(emojisGuildId)!;
    if (!guild) return;

    await guild.members.fetch();

    const role = guild.roles.cache.get(parrainRole);
    if (!role) return;

    const godfathersEmojis = await Promise.all(role.members.map((member) => getGodfatherEmoji(emojisGuild, member!)));

    // Remap proposals with godfathers acceptable decisions
    const entries: Array<{ proposal: Proposal; members_ids: Snowflake[] }> = [];
    for (const proposal of proposals) {
      if (proposal.type === ProposalType.SUGGESTION) {
        if (proposal.corrections[0]) continue;
      } else {
        const lastCorrection = proposal.suggestion?.corrections[0];
        if (lastCorrection && lastCorrection.id !== proposal.id) continue;
      }

      const members_ids: Snowflake[] = [
        ...role.members
          .filter((member) => {
            if (proposal.approvals.some((approval) => approval.user_id === member.id)) return false;
            if (proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id)) return false;
            if (proposal.user_id === member.id) return false;

            return true;
          })
          .keys()
      ];

      if (!members_ids.length) continue;

      entries.push({ proposal, members_ids });
    }

    // Reduce previous data into pages with a length < 4096 (max of embed description size)
    const { pages } = entries.reduce<{ current: string; pages: string[] }>(
      (acc, { proposal, members_ids }, index, array) => {
        const godfathers = members_ids
          .map((members_id) => godfathersEmojis.find(({ id }) => members_id === id)?.emoji)
          .filter((e) => e)
          .join(' ');
        const line = `[${proposal.type.toLowerCase()}](https://discord.com/channels/${guild.id}/${
          proposal.type === ProposalType.SUGGESTION ? suggestionsChannel : correctionsChannel
        }/${proposal.message_id}) ${godfathers}\n`;

        if (line.length + acc.current.length > 4090) {
          acc.pages.push(acc.current);
          acc.current = '>>> ';
        }

        acc.current += line;

        if (array.length === index + 1) acc.pages.push(acc.current);

        return acc;
      },
      { current: '>>> ', pages: [] }
    );

    // Filter godfathers with a minimal of 3 acceptable decisions
    const mentions = entries
      .reduce((acc, { members_ids }) => {
        for (const member_id of members_ids) {
          const memberScore = acc.get(member_id) ?? 0;
          acc.set(member_id, memberScore + 1);
        }
        return acc;
      }, new Collection<Snowflake, number>())
      .filter((score) => score >= 3)
      .map((member_id) => `<@${member_id}>`)
      .join(' ');

    const channel = this.client.channels.cache.get(remindersChannel) as TextChannel;

    // Delete all previous channel messages
    await channel.bulkDelete(await channel.messages.fetch());

    // Send all reminders pages in separate messages
    for (const index in pages) {
      const isFirstPage = Number(index) === 0;
      const isLastPage = Number(index) === pages.length;

      await channel.send({
        content: isFirstPage ? mentions : undefined,
        embeds: [
          {
            title: isFirstPage ? 'Parrains du projet Blagues API' : undefined,
            description: pages[index],
            color: 0x0067ad,
            footer: isLastPage ? { text: 'Blagues API' } : undefined,
            timestamp: isLastPage ? new Date() : undefined
          }
        ]
      });
    }
  }
}
