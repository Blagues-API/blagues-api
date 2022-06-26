import { ProposalType } from '@prisma/client';
import { messageLink } from '../utils';
import { Snowflake } from 'discord-api-types/v9';
import { ButtonStyle, Client, Collection, ComponentType, MessageComponentInteraction, TextChannel } from 'discord.js';
import schedule from 'node-schedule';
import prisma from '../../prisma';
import {
  correctionsChannelId,
  suggestionsChannelId,
  remindersChannelId,
  guildId,
  emojisGuildId,
  godfatherRoleId,
  neededSuggestionsApprovals,
  neededCorrectionsApprovals
} from '../constants';
import { getGodfatherEmoji } from './godfathers';
import { ReminderProposal } from '../../typings';

export default class Reminders {
  public client: Client;

  constructor(client: Client) {
    this.client = client;

    if (process.env.bot_reminders === 'false') return;

    // Every 10 minutes
    schedule.scheduleJob('*/10 * * * *', (date) => this.run(date));
  }

  async run(date: Date): Promise<void> {
    const needMentions = date.getHours() === 21 && date.getMinutes() === 0;
    // Get all open proposals with their dependencies and decisions
    const proposals: ReminderProposal[] = await prisma.proposal.findMany({
      where: {
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
    const entries: Array<{ proposal: ReminderProposal; members_ids: Snowflake[] }> = [];
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
            if (proposal.approvals.some((approval) => approval.user_id === member.id)) return true;
            if (proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id)) return true;
            if (proposal.user_id === member.id) return false;

            return false;
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
        const line = `[${proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction'}](${messageLink(
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

    // Filter godfathers with a minimal of 10 acceptable decisions
    const mentions =
      needMentions &&
      entries
        .reduce((acc, { members_ids }) => {
          for (const member_id of members_ids) {
            const memberScore = acc.get(member_id) ?? 0;
            acc.set(member_id, memberScore + 1);
          }
          return acc;
        }, new Collection<Snowflake, number>())
        .filter((score) => score >= 5)
        .map((_score, member_id) => `<@${member_id}>`)
        .join(' ');

    const remindersChannel = this.client.channels.cache.get(remindersChannelId) as TextChannel;
    // Delete all previous channel messages
    await remindersChannel.bulkDelete(await remindersChannel.messages.fetch());

    // Send all reminders pages in separate messages
    for (const index in pages) {
      const isFirstPage = Number(index) === 0;
      const isLastPage = Number(index) === pages.length - 1;
      await remindersChannel.send({
        content: (isFirstPage && mentions) || undefined,
        embeds: [
          {
            author: isFirstPage
              ? {
                  name: "Propositions en attente d'approbation",
                  icon_url: this.client.user!.displayAvatarURL({ extension: 'png', size: 128 })
                }
              : undefined,
            description: pages[index],
            color: 0x0067ad,
            footer: isLastPage
              ? {
                  text: 'Blagues API',
                  icon_url: pages.length > 2 ? this.client.user!.displayAvatarURL({ extension: 'png' }) : undefined
                }
              : undefined,
            timestamp: isLastPage ? new Date().toISOString() : undefined
          }
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                label: "Plus d'informations",
                customId: 'user_reminder',
                style: ButtonStyle.Success
              }
            ]
          }
        ]
      });
    }
  }

  async pendingUserReminders(interaction: MessageComponentInteraction) {
    const proposals = await prisma.proposal.findMany({
      where: {
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
    // Remap proposals with godfathers acceptable decisions
    const entries: Array<{ proposal: ReminderProposal; members_ids: Snowflake[] }> = [];
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
            if (proposal.approvals.some((approval) => approval.user_id === member.id)) return true;
            if (proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id)) return true;
            return false;
          })
          .keys()
      ];
      if (!members_ids.length) continue;
      entries.push({ proposal, members_ids });
    }

    //{proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction'}

    // Reduce previous data into pages with a length < 4096 (max of embed description size)
    const { pages } = entries.reduce<{ current: string; pages: string[] }>(
      (acc, { proposal }, index, array) => {
        const neededApprovalsCount =
          proposal.type === ProposalType.SUGGESTION ? neededSuggestionsApprovals : neededCorrectionsApprovals;

        if (
          proposal.approvals.map((m) => m.user_id).includes(`${interaction.user.id}`) ||
          proposal.disapprovals.map((m) => m.user_id).includes(`${interaction.user.id}`) ||
          proposal.user_id === interaction.user.id
        ) {
          acc.pages = [''];
          return acc;
        }
        const line = `[${ProposalType.SUGGESTION ? 'Suggestion' : 'Correction'}](${messageLink(
          guild.id,
          proposal.type === ProposalType.SUGGESTION ? suggestionsChannelId : correctionsChannelId,
          proposal.message_id!
        )}) (${Math.max(proposal.approvals.length, proposal.disapprovals.length)}/${neededApprovalsCount})\n`;
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
      await interaction.reply({
        embeds: [
          {
            author: isFirstPage
              ? {
                  name: "Propositions en attente d'approbation:"
                }
              : undefined,
            description: pages[index] || "> Vous n'avez aucun proposition en cours d'approbation.",
            color: 0x0067ad,
            footer: isLastPage
              ? {
                  text: 'Blagues API',
                  icon_url: pages.length > 2 ? `${this.client.user?.displayAvatarURL({ extension: 'png' })}` : undefined
                }
              : undefined,
            timestamp: isLastPage ? new Date().toISOString() : undefined
          }
        ],
        ephemeral: true
      });
    }
  }
}
