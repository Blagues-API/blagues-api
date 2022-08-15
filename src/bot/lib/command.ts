import { ApplicationCommandData, ApplicationCommandType, CommandInteraction, InteractionResponse } from 'discord.js';

export type AppCommandData = ApplicationCommandData & {
  channels?: string[] | string;
};

export default class Command {
  public name: string;

  private raw: AppCommandData;

  constructor(data: AppCommandData) {
    this.name = data.name;
    this.raw = data;
  }

  public get data(): AppCommandData {
    if (!this.raw.type || this.raw.type === ApplicationCommandType.ChatInput) {
      return {
        name: this.name,
        description: this.raw.description,
        type: this.raw.type,
        options: this.raw.options,
        channels: this.raw.channels
      };
    }

    return {
      name: this.name,
      type: this.raw.type,
      channels: this.raw.channels
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async run(_interaction: CommandInteraction): Promise<void | InteractionResponse> {
    throw new Error('No method run defined');
  }
}
