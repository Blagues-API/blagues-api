import { ApplicationCommandData, CommandInteraction } from 'discord.js';

export default class Command {
  public name: string;

  private raw: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.name = data.name;
    this.raw = data;
  }

  public get data(): ApplicationCommandData {
    return this.raw;
  }

  public async run(interaction: CommandInteraction) {}
}
