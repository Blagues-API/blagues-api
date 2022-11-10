import {
  APIEmbed,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  GuildMember,
  Message,
  TextChannel
} from 'discord.js';
import { diffWords } from 'diff';
import { godfatherRoleId } from '../constants';
import { waitForInteraction } from './waitFor';

export function isEmbedable(channel: TextChannel): boolean {
  const permissions = channel.permissionsFor(channel.guild.members.me!);
  return permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks']);
}

export function isGodfather(member: GuildMember): boolean {
  return member.roles.cache.has(godfatherRoleId);
}

export function tDelete(timeout = 6000): (message: Message) => NodeJS.Timeout {
  return (message: Message) => setTimeout(() => message.deletable && message.delete().catch(() => null), timeout);
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
    const buttonInteraction = await waitForInteraction({
      component_type: ComponentType.Button,
      message,
      user: interaction.user
    });

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
    // TODO: Catch les erreurs
  }

  return paginate(interaction, embed, pages, page, message);
}
