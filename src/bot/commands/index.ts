import { ApplicationCommandData, Client, CommandInteraction } from 'discord.js';
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

  public get commandsData(): ApplicationCommandData[] {
    return this.commands.map((command: Command) => command.data);
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const command = this.commands.find(
      (cmd: Command) => cmd.name === interaction.commandName
    );
    if (!command) {
      await interaction.reply('Commande innexistante !');
      return;
    }

    try {
      await command.run(interaction);
    } catch (error) {
      console.error('[Bot error]', error);
    }
  }

  public async register(): Promise<void> {
    await this.client.application?.commands.set(this.commandsData);
  }
}
