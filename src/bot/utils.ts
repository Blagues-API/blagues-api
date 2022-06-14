import { InteractionReplyOptions, TextChannel } from 'discord.js';
import { diffWords } from 'diff';
import { APIEmbed } from 'discord-api-types/v10';

export function interactionProblem(message: string, ephemeral = true): InteractionReplyOptions {
  return {
    ...problem(message),
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

export function interactionInfo(message: string): InteractionReplyOptions {
  return {
    ...info(message),
    ephemeral: true
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

export function interactionValidate(message: string): InteractionReplyOptions {
  return {
    ...validate(message),
    ephemeral: true
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
