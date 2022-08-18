import { APIEmbed } from 'discord-api-types/v10';
import { Colors } from '../constants';
import { InteractionReplyOptions, MessageOptions } from 'discord.js';

type UniversalMessageOptions = Omit<MessageOptions, 'flags'>;
type UniversalInteractionOptions = Omit<InteractionReplyOptions, 'flags'>;

export function validate(message: string): APIEmbed {
  return {
    description: `✅ ${message}`,
    color: Colors.SUCCESS
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

export function info(message: string): APIEmbed {
  return {
    description: `💡 ${message}`,
    color: Colors.INFO
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

export function problem(message: string): APIEmbed {
  return {
    description: `❌ ${message}`,
    color: Colors.DANGER
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
