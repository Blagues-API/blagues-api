import { correctionsChannelId, suggestionsChannelId } from '../constants';
import { isParrain } from '../utils';
import {
  Client,
  GuildMember,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  TextChannel,
  User
} from 'discord.js';
import prisma from '../../prisma';
import { Proposals } from '../../typings';

export default class UpVote {
  public client: Client;

  constructor(client: Client) {
    this.client = client;
  }
  async reactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    const channel = (reaction.message.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestionsChannelId;
    const message = reaction.message;

    if (
      ![suggestionsChannelId, correctionsChannelId].includes(channel.id) ||
      message.author!.id !== this.client.user!.id ||
      !isParrain(channel.guild!.members.cache.get(user.id) as GuildMember)
    )
      return;

    const proposal = (await prisma.proposal.findUnique({
      where: {
        message_id: message.id
      },
      include: {
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
        corrections: isSuggestion && {
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
    })) as Proposals | null;
    if (!proposal) return;

    const embed = message.embeds[0]?.toJSON();
    if (!embed) {
      await prisma.proposal.delete({
        where: {
          id: proposal.id
        }
      });
      return;
    }
    if (proposal.merged && !embed.footer) return;
    console.log('allo');
  }
}
