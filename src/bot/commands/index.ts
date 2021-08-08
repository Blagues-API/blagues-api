import { Client, CommandInteraction } from 'discord.js';
import Command from '../lib/command';
import CorrectCommand from './correction';
import SuggestCommand from './suggest';

export default class Commands {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public get commands(): Command[] {
    return [new SuggestCommand(), new CorrectCommand()];
  }

  public get(name: string) {
    return;
  }

  public get commandsData() {
    return this.commands.map((command: Command) => command.data);
  }

  public async execute(interaction: CommandInteraction) {
    const cmd: Command = this.commands.find(
      (command: Command) => command.name === interaction.commandName
    )!;

    try {
      await cmd.run(interaction);
    } catch (error) {
      console.error('[Bot error]', error);
    }
  }

  public async register() {
    await this.client.application?.commands.set(this.commandsData);
  }
}
