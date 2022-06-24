import { correctionsChannelId, suggestionsChannelId } from '../constants';
import { isParrain } from '../utils';
import { Client, GuildTextBasedChannel, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import prisma from '../../prisma';

export default class Votes {
  public client: Client;

  constructor(client: Client) {
    this.client = client;
  }
  async run(partialReaction: MessageReaction | PartialMessageReaction, partialUser: User | PartialUser) {
    if (!partialReaction.message.guild) return;
    const reaction = await this.checkReaction(partialReaction);
    if (!reaction) return;

    const user = await this.checkUser(partialUser);
    if (!user) return;

    const channel = reaction.message.channel as GuildTextBasedChannel;
    const message = reaction.message;

    const member = await channel.guild.members.fetch(user.id);

    if (![suggestionsChannelId, correctionsChannelId].includes(channel.id) || !isParrain(member)) return;
    const proposal = await prisma.proposal.findUnique({
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
    });
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
    if (proposal.merged || proposal.refused) return;
  }

  async checkReaction(messageReaction: MessageReaction | PartialMessageReaction) {
    try {
      if (messageReaction.partial) {
        messageReaction = await messageReaction.fetch();
      } else if (messageReaction.message.partial) {
        await messageReaction.message.fetch();
      }
    } catch {
      // Only abord errors
      return null;
    }
    if (messageReaction.message.author?.id !== messageReaction.client.user!.id) return null;
    return messageReaction;
  }

  async checkUser(user: User | PartialUser) {
    try {
      if (user.partial) user = await user.fetch();
    } catch {
      // Only abord errors
      return null;
    }
    if (user.bot) return null;
    return user;
  }
}
