import { APIEmbed } from 'discord-api-types/v10';
import { Colors } from '../constants';

export function problem(message: string): APIEmbed {
  return {
    description: `❌ ${message}`,
    color: Colors.DANGER
  };
}

export function info(message: string): APIEmbed {
  return {
    description: `💡 ${message}`,
    color: Colors.INFO
  };
}

export function validate(message: string): APIEmbed {
  return {
    description: `✅ ${message}`,
    color: Colors.SUCCESS
  };
}
