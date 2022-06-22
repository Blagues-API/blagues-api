import {
  ApplicationCommandType,
  ChatInputApplicationCommandData,
  CommandInteraction,
  InteractionResponse,
  MessageApplicationCommandData,
  MessageContextMenuCommandInteraction,
  UserApplicationCommandData
} from 'discord.js';

export default class Command {
  public name: string;

  private raw: ChatInputApplicationCommandData | MessageApplicationCommandData | UserApplicationCommandData;

  constructor(data: ChatInputApplicationCommandData | MessageApplicationCommandData | UserApplicationCommandData) {
    this.name = data.name;
    this.raw = data;
  }

  public get data(): ChatInputApplicationCommandData | MessageApplicationCommandData | UserApplicationCommandData {
    if (this.raw.type === ApplicationCommandType.ChatInput) {
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
    } as MessageApplicationCommandData | UserApplicationCommandData;
  }

  public async run(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _interaction: CommandInteraction | MessageContextMenuCommandInteraction
  ): Promise<void | InteractionResponse> {
    throw new Error('No method run defined');
  }
}
