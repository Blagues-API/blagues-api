import { ProposalType } from '@prisma/client';
import { Snowflake } from 'discord-api-types/v9';
import {
  blockQuote,
  ButtonInteraction,
  ButtonStyle,
  Client,
  Collection,
  ComponentType,
  hyperlink,
  messageLink,
  TextChannel,
  userMention
} from 'discord.js';
import schedule from 'node-schedule';
import prisma from '../../prisma';
import {
  Colors,
  correctionsChannelId,
  emojisGuildId,
  godfatherRoleId,
  guildId,
  neededCorrectionsApprovals,
  neededSuggestionsApprovals,
  summaryChannelId,
  suggestionsChannelId
} from '../constants';
import { getGodfatherEmoji } from './godfathers';
import { SummaryProposal } from '../../typings';
import dayjs from 'dayjs';
import { setTimeout as sleep } from 'timers/promises';

export class Summary {
  private pending = false;
  private lastUpdate = 0;

  constructor(public client: Client) {
    if (process.env.BOT_SUMMARY === 'false') return;

    // At 21:00
    schedule.scheduleJob('0 21 * * *', () => this.reload(true));

    this.reload();
  }

  async askReload() {
    if (this.pending) return;

    const nextAllowedUpdate = this.lastUpdate + 3;

    if (dayjs().unix() < nextAllowedUpdate) {
      this.pending = true;

      await sleep(Math.min(nextAllowedUpdate - dayjs().unix(), 0) * 1000);

      this.pending = false;
    }

    await this.reload();

    this.lastUpdate = dayjs().unix();
  }

  async reload(needMentions = false): Promise<void> {
    if (process.env.BOT_SUMMARY === 'false') return;

    // Get all open proposals with their dependencies and decisions
    const proposals: SummaryProposal[] = await prisma.proposal.findMany({
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

    const godfathersEmojis = new Map<string, string>();
    for (const member of godfatherRole.members.values()) {
      const emoji = await getGodfatherEmoji(emojisGuild, member);
      if (!emoji) continue;

      godfathersEmojis.set(member.id, emoji);
    }

    proposals.sort((a, b) => a.approvals.length + a.disapprovals.length - (b.approvals.length + b.disapprovals.length));

    // Remap proposals with godfathers acceptable decisions
    const entries: Array<{ proposal: SummaryProposal; members_ids: Snowflake[] }> = [];
    for (const proposal of proposals) {
      if (proposal.type === ProposalType.SUGGESTION) {
        if (proposal.corrections[0]) continue;
      } else {
        const lastCorrection = proposal.suggestion?.corrections[0];
        if (lastCorrection && lastCorrection.id !== proposal.id) continue;
      }

      const members_ids: Snowflake[] = [
        ...godfatherRole.members
          .filter(
            (member) =>
              proposal.approvals.some((approval) => approval.user_id === member.id) ||
              proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id) ||
              proposal.user_id === member.id
          )
          .keys()
      ];

      entries.push({ proposal, members_ids });
    }

    // Reduce previous data into pages with a length < 4096 (max of embed description size)
    const { pages } = entries.reduce<{ current: string; pages: string[] }>(
      (acc, { proposal, members_ids }, index, array) => {
        const godfathers = members_ids
          .map((member_id) => godfathersEmojis.get(member_id))
          .filter((e) => e)
          .join(' ');

        const member = guild.members.cache.get(proposal.user_id!);
        const proposalType = proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction';
        const link = hyperlink(
          proposalType,
          messageLink(
            proposal.type === ProposalType.SUGGESTION ? suggestionsChannelId : correctionsChannelId,
            proposal.message_id!,
            guild.id
          ),
          member ? proposalType + ' de ' + member.displayName : proposalType
        );

        const line = `${link} ${godfathers}\n`;

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

    const godFatherMember: Snowflake[] = [...godfatherRole.members.keys()];

    // Filter godfathers with a minimal of 10 acceptable decisions
    const mentions =
      needMentions &&
      entries
        .reduce((acc, { members_ids }) => {
          for (const member_id of godFatherMember.filter((m) => !members_ids.includes(m))) {
            const memberScore = acc.get(member_id) ?? 0;
            acc.set(member_id, memberScore + 1);
          }
          return acc;
        }, new Collection<Snowflake, number>())
        .filter((score) => score >= 5)
        .map((_score, member_id) => userMention(member_id))
        .join(' ');

    const summaryChannel = this.client.channels.cache.get(summaryChannelId) as TextChannel;

    // Delete all previous channel messages
    await summaryChannel.bulkDelete(await summaryChannel.messages.fetch());

    // Send all summary pages in separate messages
    for (const index in pages) {
      const isFirstPage = Number(index) === 0;
      const isLastPage = Number(index) === pages.length - 1;
      await summaryChannel.send({
        content: (isFirstPage && mentions) || undefined,
        embeds: [
          {
            author: isFirstPage
              ? {
                  name: "Propositions en attente d'approbation :",
                  icon_url: this.client.user!.displayAvatarURL({ extension: 'png', size: 128 })
                }
              : undefined,
            description: pages[index],
            color: Colors.SECONDARY,
            footer: isLastPage
              ? {
                  text: 'Blagues API',
                  icon_url: pages.length > 2 ? this.client.user!.displayAvatarURL({ extension: 'png' }) : undefined
                }
              : undefined,
            timestamp: isLastPage ? new Date().toISOString() : undefined
          }
        ],
        components: isLastPage
          ? [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    emoji: '📑',
                    label: 'Mes propositions',
                    customId: 'user_summary',
                    style: ButtonStyle.Primary
                  }
                ]
              }
            ]
          : []
      });
    }
  }

  async pendingUserDecisions(interaction: ButtonInteraction) {
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

    proposals.sort((a, b) => a.approvals.length + a.disapprovals.length - (b.approvals.length + b.disapprovals.length));

    // Remap proposals with godfathers acceptable decisions
    const entries: Array<{ proposal: SummaryProposal; members_ids: Snowflake[] }> = [];
    for (const proposal of proposals) {
      if (proposal.type === ProposalType.SUGGESTION) {
        if (proposal.corrections[0]) continue;
      } else {
        const lastCorrection = proposal.suggestion?.corrections[0];
        if (lastCorrection && lastCorrection.id !== proposal.id) continue;
      }

      const members_ids: Snowflake[] = [
        ...godfatherRole.members
          .filter(
            (member) =>
              proposal.approvals.some((approval) => approval.user_id === member.id) ||
              proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id)
          )
          .keys()
      ];
      entries.push({ proposal, members_ids });
    }

    // Reduce previous data into pages with a length < 4096 (max of embed description size)
    const { description } = entries.reduce(
      (acc, { proposal }, index, array) => {
        const neededApprovalsCount =
          proposal.type === ProposalType.SUGGESTION ? neededSuggestionsApprovals : neededCorrectionsApprovals;

        if (
          proposal.approvals.map((m) => m.user_id).includes(interaction.user.id) ||
          proposal.disapprovals.map((m) => m.user_id).includes(interaction.user.id) ||
          proposal.user_id === interaction.user.id
        ) {
          return acc;
        }

        const link = hyperlink(
          proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction',
          messageLink(
            proposal.type === ProposalType.SUGGESTION ? suggestionsChannelId : correctionsChannelId,
            proposal.message_id!,
            guild.id
          )
        );
        const approvalsCount = Math.max(proposal.approvals.length, proposal.disapprovals.length);

        const line = `${link} (${approvalsCount}/${neededApprovalsCount})\n`;

        if (line.length + acc.description.length > 4090) {
          if (array.length === index + 1) {
            acc.description += `Et ${acc.count} autres...`;
            return acc;
          }

          acc.count++;
          return acc;
        }

        acc.description += line;

        return acc;
      },
      { description: '', count: 0 }
    );

    // Send all summary pages in separate messages
    await interaction.reply({
      embeds: [
        {
          author: {
            name: "Propositions en attente d'approbation:"
          },
          description: blockQuote(description || "Vous n'avez aucune proposition en cours d'approbation."),
          color: Colors.SECONDARY,
          footer: {
            text: 'Blagues API',
            icon_url: this.client.user?.displayAvatarURL({ extension: 'png' })
          },
          timestamp: new Date().toISOString()
        }
      ],
      ephemeral: true
    });
  }
}
