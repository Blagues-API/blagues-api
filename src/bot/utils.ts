import {
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  GuildMember,
  InteractionReplyOptions,
  Message,
  TextChannel,
  User
} from 'discord.js';
import { diffWords } from 'diff';
import { APIEmbed } from 'discord-api-types/v10';
import { godfatherRoleId } from './constants';

type UniversalInteractionOptions = Omit<InteractionReplyOptions, 'flags'>;

export function interactionProblem(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    ...problem(message),
    components: [],
    content: '',
    ephemeral
  };
}

export function problem(message: string): { embeds: APIEmbed[] } {
  return {
    embeds: [
      {
        description: `❌ ${message}`,
        color: 0xff0000
      }
    ]
  };
}

export function interactionInfo(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    ...info(message),
    components: [],
    content: '',
    ephemeral
  };
}

export function info(message: string): { embeds: APIEmbed[] } {
  return {
    embeds: [
      {
        description: `💡 ${message}`,
        color: 0xffd983
      }
    ]
  };
}

export function interactionValidate(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    ...validate(message),
    content: '',
    components: [],
    ephemeral
  };
}

export function validate(message: string): { embeds: APIEmbed[] } {
  return {
    embeds: [
      {
        description: `✅ ${message}`,
        color: 0x7fef34
      }
    ]
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
