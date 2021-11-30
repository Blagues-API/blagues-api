import {
  ApplicationCommandPermissions,
  ChatInputApplicationCommandData,
  CommandInteraction,
  MessageApplicationCommandData
} from 'discord.js';
import { parrainRole } from '../constants';

interface CommandChatInfos extends ChatInputApplicationCommandData {
  parrainOnly?: boolean;
}

interface CommandMessageInfos extends MessageApplicationCommandData {
  parrainOnly?: boolean;
}

export default class Command {
  public name: string;

  private raw: CommandChatInfos | CommandMessageInfos;

  public parrainOnly: boolean;

  constructor(data: CommandChatInfos | CommandMessageInfos) {
    this.name = data.name;
    this.raw = data;

    this.parrainOnly = data.parrainOnly ?? false;
  }

  public get data(): ChatInputApplicationCommandData | MessageApplicationCommandData {
    if (this.raw.type === 'CHAT_INPUT') {
      return {
        name: this.name,
        description: this.raw.description,
        type: this.raw.type,
        options: this.raw.options,
        defaultPermission: !this.raw.parrainOnly
      } as ChatInputApplicationCommandData;
    }

    return {
      name: this.name,
      type: this.raw.type,
      defaultPermission: !this.raw.parrainOnly
    } as CommandMessageInfos;
  }

  public get permissions(): ApplicationCommandPermissions[] | null {
    if (!this.raw.parrainOnly) return null;
    return [
      {
        id: parrainRole,
        type: 'ROLE',
        permission: true
      }
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async run(interaction: CommandInteraction): Promise<void> {
    throw new Error('No method run defined');
  }
}
