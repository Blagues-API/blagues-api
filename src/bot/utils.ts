import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  CommandInteraction,
  ComponentType,
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessageComponentType,
  MessageContextMenuCommandInteraction,
  MessageOptions,
  SelectMenuInteraction,
  TextChannel,
  User
} from 'discord.js';
import { diffWords } from 'diff';
import { APIEmbed } from 'discord-api-types/v10';
import { Colors, dataSplitRegex, godfatherRoleId } from './constants';
import { suggestionsChannelId, correctionsChannelId, reportsChannelId } from './constants';
import { Proposals } from '../typings';
import { renderGodfatherLine } from './modules/godfathers';

type UniversalInteractionOptions = Omit<InteractionReplyOptions, 'flags'>;
type UniversalMessageOptions = Omit<MessageOptions, 'flags'>;

type WaitForInteractionOptions<T extends MessageComponentType> = {
  component_type: T;
  message: Message;
  user: User;
  idle?: number;
};

type WaitForInteraction<T> = T extends WaitForInteractionOptions<ComponentType.Button>
  ? ButtonInteraction<'cached'>
  : SelectMenuInteraction<'cached'>;

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

export async function interactionWaiter<T extends WaitForInteractionOptions<MessageComponentType>>(options: T) {
  return new Promise<WaitForInteraction<T>>((resolve, reject) => {
    const { component_type, message, user, idle = 60_000 } = options;
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
        if (reason !== 'idle') reject(reason);
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

export async function waitForConfirmation(
  interaction: ChatInputCommandInteraction,
  embed: APIEmbed,
  sendType: string
): Promise<ButtonInteraction<'cached'>> {
  const message = await interaction.reply({
    content: `Êtes-vous sûr de vouloir confirmer la proposition de ce${
      sendType === 'report' ? 'ce signalement' : 'cette blague'
    } ?`,
    embeds: [embed],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            label: 'Envoyer',
            customId: 'send',
            style: ButtonStyle.Success
          },
          {
            type: ComponentType.Button,
            label: 'Annuler',
            customId: 'cancel',
            style: ButtonStyle.Danger
          }
        ]
      }
    ],
    ephemeral: true,
    fetchReply: true
  });

  return interactionWaiter({
    component_type: ComponentType.Button,
    message,
    user: interaction.user
  });
}

export async function updateProposalEmbed(
  interaction: MessageContextMenuCommandInteraction<'cached'>,
  proposal: Proposals,
  embed: APIEmbed
) {
  const godfathers = await renderGodfatherLine(interaction, proposal);
  const field = embed.fields?.[embed.fields.length - 1];
  if (field) {
    const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
    field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
  } else {
    const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
    embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
  }

  return embed;
}

export async function checkProposalStatus(
  interaction: MessageContextMenuCommandInteraction<'cached'>,
  proposal: Proposals,
  message: Message
) {
  const embed = message.embeds[0].toJSON();
  if (proposal.merged) {
    if (!embed.footer) {
      embed.color = Colors.ACCEPTED;
      embed.footer = { text: `${Declaration[message.channel.id].WORD_CAPITALIZED} déjà traitée` };

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = field.value.match(dataSplitRegex)!.groups!.base;
      } else {
        embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
      }

      await message.edit({ embeds: [embed] });
    }

    return interaction.reply(interactionProblem(`${Declaration.EMBED_FOOTER_WITH_DETERMINANT} a déjà été ajoutée.`));
  }

  if (proposal.refused) {
    if (!embed.footer) {
      embed.color = Colors.REFUSED;
      embed.footer = { text: `${Declaration[message.channel.id].WORD_CAPITALIZED} refusée` };

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = field.value.match(dataSplitRegex)!.groups!.base;
      } else {
        embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
      }

      await message.edit({ embeds: [embed] });
    }

    return interaction.reply(
      interactionProblem(`${Declaration[message.channel.id].WITH_DEMONSTRATIVE_DETERMINANT} a déjà été refusée}.`)
    );
  }

  return null;
}

type DeclarationTemplate = {
  WORD: string;
  WORD_CAPITALIZED: string;
  WITH_UNDEFINED_ARTICLE: string;
  WITH_DEMONSTRATIVE_DETERMINANT: string;
};

export const Declaration: Record<string, DeclarationTemplate> = {
  [suggestionsChannelId]: {
    WORD: 'blague',
    WORD_CAPITALIZED: 'Blague',
    WITH_UNDEFINED_ARTICLE: 'une blague',
    WITH_DEMONSTRATIVE_DETERMINANT: 'Cette blague'
  },
  [correctionsChannelId]: {
    WORD: 'correction',
    WORD_CAPITALIZED: 'Correction',
    WITH_UNDEFINED_ARTICLE: 'une correction',
    WITH_DEMONSTRATIVE_DETERMINANT: 'Cette correction'
  },
  [reportsChannelId]: {
    WORD: 'signalement',
    WORD_CAPITALIZED: 'Signalement',
    WITH_UNDEFINED_ARTICLE: 'un signalement',
    WITH_DEMONSTRATIVE_DETERMINANT: 'Ce signalement'
  }
} as const;
