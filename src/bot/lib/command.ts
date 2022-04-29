import {
  ChatInputApplicationCommandData,
  CommandInteraction,
  MessageApplicationCommandData,
  MessageContextMenuInteraction
} from 'discord.js';

export default class Command {
  public name: string;

  private raw: ChatInputApplicationCommandData | MessageApplicationCommandData;

  constructor(data: ChatInputApplicationCommandData | MessageApplicationCommandData) {
    this.name = data.name;
    this.raw = data;
  }

  public get data(): ChatInputApplicationCommandData | MessageApplicationCommandData {
    if (this.raw.type === 'CHAT_INPUT') {
      return {
        name: this.name,
        description: this.raw.description,
        type: this.raw.type,
        options: this.raw.options
      } as ChatInputApplicationCommandData;
    }

    return {
      name: this.name,
      type: this.raw.type
    } as MessageApplicationCommandData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async run(_interaction: CommandInteraction | MessageContextMenuInteraction): Promise<void> {
    throw new Error('No method run defined');
  }
}
