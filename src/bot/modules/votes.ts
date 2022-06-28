import { correctionsChannelId, downReaction, suggestionsChannelId, upReaction } from '../constants';
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

    if (![suggestionsChannelId, correctionsChannelId].includes(channel.id) || isParrain(member)) return;
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
            disapprovals: true,
            votes: true
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
        disapprovals: true,
        votes: true
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
    if (proposal.merged || proposal.refused || proposal.stale) return;

    const type = reaction.emoji.name == upReaction ? 'UP' : reaction.emoji.name == downReaction ? 'DOWN' : null;
    if (!type) return;
    (message.reactions.resolve(type == 'UP' ? downReaction : upReaction) as MessageReaction).users.remove(user.id);
    const voteIndex = proposal.votes.findIndex((vote) => vote.user_id == user.id);
    if (voteIndex !== -1) {
      await prisma.vote.delete({
        where: {
          proposal_id_user_id: {
            proposal_id: proposal.id,
            user_id: user.id
          }
        }
      });
    }

    proposal.votes.push(
      await prisma.vote.create({
        data: {
          proposal_id: proposal.id,
          user_id: user.id,
          type: type
        }
      })
    );
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
