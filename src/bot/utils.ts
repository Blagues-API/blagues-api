import {
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessageComponentType,
  MessageOptions,
  SelectMenuInteraction,
  TextChannel,
  User
} from 'discord.js';
import { diffWords } from 'diff';
import { APIEmbed } from 'discord-api-types/v10';
import { godfatherRoleId } from './constants';

type UniversalInteractionOptions = Omit<InteractionReplyOptions, 'flags'>;
type UniversalMessageOptions = Omit<MessageOptions, 'flags'>;

type WaitForInteractionOptions<T extends MessageComponentType> = {
  component_type: T;
  message: Message<true>;
  user: User;
  idle?: number;
};
type WaitForInteraction<T> = T extends WaitForInteractionOptions<ComponentType.Button>
  ? ButtonInteraction<'cached'>
  : SelectMenuInteraction<'cached'>;

type WaiterOptions = {
  reject_on_idle?: boolean;
};

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

export function error(message: string): APIEmbed {
  return { color: 0xd6080f, description: `❌ ${message}` };
}

export function messageError(message: string): UniversalMessageOptions {
  return {
    content: '',
    embeds: [error(message)],
    components: []
  };
}

export function interactionError(message: string, ephemeral = true): UniversalInteractionOptions {
  return {
    content: '',
    embeds: [error(message)],
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

export function isEmbedable(channel: TextChannel): boolean {
  const permissions = channel.permissionsFor(channel.guild.members.me!);
  return permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks']);
}

export function tDelete(timeout = 6000): (message: Message) => NodeJS.Timeout {
  return (message: Message) => setTimeout(() => message.deletable && message.delete().catch(() => null), timeout);
}

export function messageLink(guildId: string, channelId: string, messageId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function isGodfather(member: GuildMember): boolean {
  return member.roles.cache.has(godfatherRoleId);
}

export async function interactionWaiter<T extends WaitForInteractionOptions<MessageComponentType>>(
  componentOptions: T,
  waiterOptions: WaiterOptions = {}
) {
  return new Promise<WaitForInteraction<T>>((resolve, reject) => {
    const { component_type, message, user, idle = 60_000 } = componentOptions;
    const { reject_on_idle = false } = waiterOptions;

    message
      .createMessageComponentCollector({
        componentType: component_type,
        idle: idle
      })
      .on('collect', async (interaction: WaitForInteraction<T>) => {
        if (interaction.user.id !== user.id) {
          await interaction.reply(interactionInfo("Vous n'êtes pas autorisé à interagir avec ce message."));
          return;
        }
        resolve(interaction);
      })
      .once('end', (_interactions, reason) => {
        if (reject_on_idle) {
          reject(reason);

          return;
        }
        if (reason !== 'idle') {
          reject(reason);

          return;
        }
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
    const buttonInteraction = await interactionWaiter({
      component_type: ComponentType.Button,
      message: message,
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
    // TOOD: Catch les erreurs
  }

  return paginate(interaction, embed, pages, page, message);
}
