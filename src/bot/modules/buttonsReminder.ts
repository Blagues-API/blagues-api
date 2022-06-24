import { Proposal, ProposalType } from '@prisma/client';
import { correctionsChannelId, emojisGuildId, godfatherRoleId, guildId, suggestionsChannelId } from 'bot/constants';
import { messageLink } from 'bot/utils';
import { Client, MessageComponentInteraction, Snowflake } from 'discord.js';
import prisma from 'prisma';
import { getGodfatherEmoji } from './godfathers';

export default class buttonsReminder {
  public client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async run(interaction: MessageComponentInteraction) {
    const proposals = await prisma.proposal.findMany({
      where: {
        user_id: interaction.member?.user.id,
        merged: false,
        refused: false,
        stale: false
      },
      orderBy: {
        created_at: 'asc'
      },
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
    if (!guild || !emojisGuild) return;

    await guild.members.fetch();

    const godfatherRole = guild.roles.cache.get(godfatherRoleId);
    if (!godfatherRole) return;

    const godfathersEmojis = await Promise.all(
      godfatherRole.members.map((member) => getGodfatherEmoji(emojisGuild, member))
    );

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
        ...godfatherRole.members
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
        const line = `[[${proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction'}]](${messageLink(
          guild.id,
          proposal.type === ProposalType.SUGGESTION ? suggestionsChannelId : correctionsChannelId,
          proposal.message_id!
        )}) ${godfathers}\n`;

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

    // Send all reminders pages in separate messages
    for (const index in pages) {
      const isFirstPage = Number(index) === 0;
      const isLastPage = Number(index) === pages.length - 1;
      const types = proposals.reduce(
        (acc, proposal) => acc.add(proposal.type === ProposalType.SUGGESTION ? 'suggestions' : 'corrections'),
        new Set()
      );
      await interaction[interaction.replied ? 'editReply' : 'reply']({
        embeds: [
          {
            author: isFirstPage
              ? {
                  name: 'Parrains du projet Blagues API',
                  url: 'https://blagues-api.fr',
                  icon_url: this.client.user?.avatarURL({ extension: 'png', size: 128 }) || undefined
                }
              : undefined,
            title: isFirstPage
              ? `Voici ${
                  proposals.length === 1
                    ? `la ${proposals[0].type === ProposalType.SUGGESTION ? 'suggestion' : 'correction'}`
                    : `les ${[...types.values()].join('/')}`
                } en cours :`
              : undefined,
            description: pages[index],
            color: 0x0067ad,
            footer: isLastPage
              ? {
                  text: 'Blagues API',
                  icon_url: pages.length > 2 ? `${this.client.user?.avatarURL({ extension: 'png' })}` : undefined
                }
              : undefined,
            timestamp: isLastPage ? new Date().toISOString() : undefined
          }
        ]
      });
    }
  }
}
