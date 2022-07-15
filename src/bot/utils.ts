import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  CommandInteraction,
  ComponentType,
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessageOptions,
  TextChannel,
  User
} from 'discord.js';
import { diffWords } from 'diff';
import { APIEmbed } from 'discord-api-types/v10';
import { godfatherRoleId } from './constants';
import prisma from '../prisma';
import { Category, UnsignedJoke } from 'typings';
import { ProposalType } from '@prisma/client';
import { jokeById, jokeByQuestion } from 'controllers';

type UniversalInteractionOptions = Omit<InteractionReplyOptions, 'flags'>;
type UniversalMessageOptions = Omit<MessageOptions, 'flags'>;

export function problem(message: string): APIEmbed {
  return {
    description: `❌ ${message}`,
    color: 0xff0000
  };
}

export function messageProblem(message: string): UniversalMessageOptions {
  return {
    content: '',
    embeds: [problem(message)],
    components: []
  };
}

export function interactionProblem(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    content: '',
    embeds: [problem(message)],
    components: [],
    ephemeral
  };
}

export function info(message: string): APIEmbed {
  return {
    description: `💡 ${message}`,
    color: 0xffd983
  };
}

export function messageInfo(message: string): UniversalMessageOptions {
  return {
    content: '',
    embeds: [info(message)],
    components: []
  };
}

export function interactionInfo(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    content: '',
    embeds: [info(message)],
    components: [],
    ephemeral
  };
}

export function validate(message: string): APIEmbed {
  return {
    description: `✅ ${message}`,
    color: 0x7fef34
  };
}

export function messageValidate(message: string): UniversalMessageOptions {
  return {
    content: '',
    embeds: [validate(message)],
    components: []
  };
}

export function interactionValidate(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    content: '',
    embeds: [validate(message)],
    components: [],
    ephemeral
  };
}

export function showPositiveDiffs(oldValue: string, newValue: string): string {
  return diffWords(oldValue, newValue)
    .filter((part) => !part.removed)
    .map((part) => `${part.added ? '`' : ''}${part.value}${part.added ? '`' : ''}`)
    .join('');
}

export function showNegativeDiffs(oldValue: string, newValue: string): string {
  return diffWords(oldValue, newValue)
    .filter((part) => !part.added)
    .map((part) => `${part.removed ? '~~`' : ''}${part.value}${part.removed ? '`~~' : ''}`)
    .join('');
}

export function isEmbedable(channel: TextChannel) {
  const permissions = channel.permissionsFor(channel.guild.members.me!);
  return permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks']);
}

export function tDelete(timeout = 6000) {
  return (message: Message) => setTimeout(() => message.deletable && message.delete().catch(() => null), timeout);
}

export function messageLink(guildId: string, channelId: string, messageId: string) {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function isParrain(member: GuildMember) {
  return member.roles.cache.has(godfatherRoleId);
}

export async function interactionWaiter(message: Message<true>, user: User) {
  return new Promise<ButtonInteraction<'cached'>>((resolve, reject) => {
    const collector = message
      .createMessageComponentCollector({
        componentType: ComponentType.Button,
        idle: 60_000
      })
      .on('collect', async (interaction) => {
        if (interaction.user.id !== user.id) {
          await interaction.reply(interactionInfo("Vous n'êtes pas autorisé à interagir avec ce message."));
          return;
        }
        collector.stop('finish');
        resolve(interaction);
      })
      .once('end', (_interactions, reason) => {
        if (reason !== 'finish') reject(reason);
      });
  });
}

export async function paginate(
  interaction: CommandInteraction<'cached'>,
  embed: APIEmbed,
  pages: string[],
  page = 0,
  oldMessage: Message<true> | null = null
): Promise<void> {
  const message =
    oldMessage ||
    (await interaction.reply({
      embeds: [embed],
      components:
        pages.length > 1
          ? [
              {
                type: ComponentType.ActionRow,
                components: [
                  { type: ComponentType.Button, label: 'Précedent', style: ButtonStyle.Primary, customId: 'last' },
                  { type: ComponentType.Button, label: 'Suivant', style: ButtonStyle.Primary, customId: 'next' }
                ]
              }
            ]
          : [],
      fetchReply: true
    }));

  if (pages.length <= 1) return;

  try {
    const buttonInteraction = await interactionWaiter(message, interaction.user);
    if (!buttonInteraction) return;

    switch (buttonInteraction.customId) {
      case 'last':
        page = (page > 0 ? page : pages.length) - 1;
        break;
      case 'next':
        page = page < pages.length - 1 ? page + 1 : 0;
        break;
    }

    embed.description = pages[page];
    embed.footer = { ...(embed.footer ?? {}), text: `Page ${page + 1}/${pages.length} • Blagues-API` };

    await buttonInteraction.update({ embeds: [embed] });
  } catch (error) {
    // TOOD: Catch les erreurs
  }

  return paginate(interaction, embed, pages, page, message);
}

enum IdType {
  MESSAGE_ID,
  JOKE_ID,
  MESSAGE_QUESTION
}

export interface JokeCorrectionPayload extends UnsignedJoke {
  id?: number;
  correction_type: ProposalType;
  suggestion: UnsignedJoke & {
    message_id: string | null;
    proposal_id: number;
  };
}

function getIdType(query: string): IdType {
  if (isNaN(Number(query))) {
    return IdType.MESSAGE_QUESTION;
  }
  if (query.length > 6) {
    return IdType.MESSAGE_ID;
  }
  return IdType.JOKE_ID;
}

export async function findJoke(
  interaction: ChatInputCommandInteraction<'cached'>,
  query: string
): Promise<JokeCorrectionPayload | null> {
  const idType = getIdType(query);
  if (idType === IdType.MESSAGE_ID) {
    const proposal = await prisma.proposal.findUnique({
      where: {
        message_id: query
      },
      include: {
        corrections: {
          take: 1,
          orderBy: {
            created_at: 'desc'
          },
          where: {
            merged: false,
            refused: false
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
                refused: false
              }
            }
          }
        }
      }
    });
    if (!proposal) {
      interaction.channel
        ?.send(
          messageProblem(
            `Impossible de trouver une blague ou correction liée à cet ID de blague, assurez vous que cet ID provient bien d\'un message envoyé par le bot ${interaction.client.user}`
          )
        )
        .then(tDelete(5000));
      return null;
    }

    const origin = proposal.type === ProposalType.SUGGESTION ? proposal : proposal.suggestion!;

    return {
      id: proposal.joke_id ?? undefined,
      type: (origin.corrections[0]?.joke_type ?? origin.joke_type) as Category,
      joke: (origin.corrections[0]?.joke_question ?? origin.joke_question)!,
      answer: (origin.corrections[0]?.joke_answer ?? origin.joke_answer)!,
      correction_type: origin.merged ? ProposalType.CORRECTION : ProposalType.SUGGESTION_CORRECTION,
      suggestion: {
        message_id: origin.message_id,
        proposal_id: origin.id,
        type: origin.joke_type as Category,
        joke: origin.joke_question!,
        answer: origin.joke_answer!
      }
    };
  }

  const joke = idType === IdType.JOKE_ID ? jokeById(Number(query)) : jokeByQuestion(query);
  if (!joke) {
    interaction.channel
      ?.send(
        messageProblem(
          `Impossible de trouver une blague à partir de ${
            idType === IdType.JOKE_ID ? 'cet identifiant' : 'cette question'
          }, veuillez réessayer !`
        )
      )
      .then(tDelete(5000));
    return null;
  }

  const proposal = await prisma.proposal.upsert({
    create: {
      joke_id: joke.id,
      joke_type: joke.type,
      joke_question: joke.joke,
      joke_answer: joke.answer,
      type: ProposalType.SUGGESTION,
      merged: true
    },
    include: {
      corrections: {
        take: 1,
        orderBy: {
          created_at: 'desc'
        },
        where: {
          merged: false,
          refused: false
        }
      }
    },
    update: {},
    where: {
      joke_id: joke.id
    }
  });

  const correction = proposal.corrections[0];
  return {
    id: proposal.joke_id!,
    type: (correction?.joke_type ?? proposal.joke_type) as Category,
    joke: (correction?.joke_question ?? proposal.joke_question)!,
    answer: (correction?.joke_answer ?? proposal.joke_answer)!,
    correction_type: ProposalType.CORRECTION,
    suggestion: {
      message_id: proposal.message_id,
      proposal_id: proposal.id,
      type: proposal.joke_type as Category,
      joke: proposal.joke_question!,
      answer: proposal.joke_answer!
    }
  };
}
