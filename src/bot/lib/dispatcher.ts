import {
  ApplicationCommand,
  ApplicationCommandData,
  Client,
  CommandInteraction,
  GuildApplicationCommandPermissionData
} from 'discord.js';
import Command from './command';

import CorrectCommand from '../commands/correction';
import SuggestCommand from '../commands/suggest';
import StatsCommand from '../commands/stats';
import ApproveCommand from '../commands/approve';
import DisapproveCommand from '../commands/disapprove';

export default class Dispatcher {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public get commands(): Command[] {
    return [
      new SuggestCommand(),
      new CorrectCommand(),
      new StatsCommand(),
      new ApproveCommand(),
      new DisapproveCommand()
    ];
  }

  public get commandsData(): ApplicationCommandData[] {
    return this.commands.map((command: Command) => command.data);
  }

  public get commandsPermissions(): Command[] {
    return this.commands.filter((command: Command) => command.parrainOnly);
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const command = this.commands.find((cmd: Command) => cmd.name === interaction.commandName);

    if (!command) {
      await interaction.reply('Commande innexistante !');

      await interaction.guild?.commands.delete(interaction.commandId);
      return;
    }

    try {
      await command.run(interaction);
    } catch (error) {
      console.error('[Bot error]', error);
    }
  }

  public async register(): Promise<void> {
    const guild = this.client.guilds.cache.get(process.env.SERVER_ID!);
    if (!guild) return;

    const registredCommands = await guild.commands.set(this.commandsData);
    await guild.commands.permissions.set({
      fullPermissions: this.commandsPermissions.map((command: Command) => {
        const registredCommand = registredCommands.find((c: ApplicationCommand) => c.name === command.name);
        return {
          id: registredCommand!.id,
          permissions: command.permissions
        };
      }) as GuildApplicationCommandPermissionData[]
    });
  }
}
