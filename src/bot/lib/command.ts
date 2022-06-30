import { ApplicationCommandData, ApplicationCommandType, CommandInteraction, InteractionResponse } from 'discord.js';

export default class Command {
  public name: string;

  private raw: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.name = data.name;
    this.raw = data;
  }

  public get data(): ApplicationCommandData {
    if (!this.raw.type || this.raw.type === ApplicationCommandType.ChatInput) {
      return {
        name: this.name,
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
