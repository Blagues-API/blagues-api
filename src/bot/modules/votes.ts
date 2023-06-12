import { VoteType } from '@prisma/client';
import {
  Client,
  GuildTextBasedChannel,
  Message,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User
} from 'discord.js';
import prisma from '../../prisma';
import { correctionsChannelId, downReactionIdentifier, suggestionsChannelId, upReactionIdentifier } from '../constants';
import { isGodfather } from '../utils';

const Reactions = {
  [upReactionIdentifier]: VoteType.UP,
  [downReactionIdentifier]: VoteType.DOWN
};

export class Votes {
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

    if (![suggestionsChannelId, correctionsChannelId].includes(channel.id) || isGodfather(member)) return;

    const proposal = await prisma.proposal.findUnique({
      where: {
        message_id: message.id
      },
      include: {
        approvals: {
          select: {
            user_id: true
          }
        },
        disapprovals: {
          select: {
            user_id: true
          }
        },
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

    const emoji = (reaction.emoji.id || reaction.emoji.name) as string;
    const type = Reactions[emoji];
    if (!type) return;

    if (
      isGodfather(member) &&
      (proposal.approvals.some((approval) => approval.user_id === member.id) ||
        proposal.disapprovals.some((disapproval) => disapproval.user_id === member.id))
    ) {
      await reaction.users.remove(user);
      return;
    }

    const vote = proposal.votes.find((vote) => vote.user_id == user.id);
    if (vote) {
      const oppositReaction = message.reactions.resolve(
        type === VoteType.UP ? downReactionIdentifier : upReactionIdentifier
      );
      if (oppositReaction) {
        const users = await oppositReaction.users.fetch();
        if (users.has(user.id)) await oppositReaction.users.remove(user.id);
      }

      if (vote.type !== type) {
        await prisma.vote.update({
          data: {
            type: type
          },
          where: {
            proposal_id_user_id: {
              proposal_id: proposal.id,
              user_id: user.id
            }
          }
        });
      }
    } else {
      await prisma.vote.create({
        data: {
          proposal_id: proposal.id,
          user_id: user.id,
          type: type
        }
      });
    }
  }

  async deleteUserVotes(message: Message, userId: string) {
    const upReaction = message.reactions.resolve(upReactionIdentifier);
    if (upReaction) {
      const users = await upReaction.users.fetch();
      if (users.has(userId)) await upReaction.users.remove(userId);
    }
    const downReaction = message.reactions.resolve(downReactionIdentifier);
    if (downReaction) {
      const users = await downReaction.users.fetch();
      if (users.has(userId)) await downReaction.users.remove(userId);
    }
  }

  private async checkReaction(messageReaction: MessageReaction | PartialMessageReaction) {
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

  private async checkUser(user: User | PartialUser) {
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
