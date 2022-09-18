import { ApplicationCommandData, ApplicationCommandType, CommandInteraction, InteractionResponse } from 'discord.js';

type ApplicationCommandDataWithChannel = ApplicationCommandData & {
  channels?: string[];
};

export default class Command {
  public name: string;
  public channels: string[];

  private raw: ApplicationCommandData;

  constructor(data: ApplicationCommandDataWithChannel) {
    this.name = data.name;
    this.channels = data.channels ?? [];
    this.raw = data;
  }

  public get data(): ApplicationCommandData {
    if (!this.raw.type || this.raw.type === ApplicationCommandType.ChatInput) {
      return {
        name: this.name,
        nameLocalizations: this.raw.nameLocalizations,
        description: this.raw.description,
        type: this.raw.type,
        options: this.raw.options
      };
    }

    return {
      name: this.name,
      type: this.raw.type
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async run(_interaction: CommandInteraction): Promise<void | InteractionResponse> {
    throw new Error('No method run defined');
  }
}
