import { ApplicationCommandData, channelMention, Client, CommandInteraction } from 'discord.js';
import Command from './command';

import { commandsChannelId, correctionsChannelId, guildId, suggestionsChannelId } from '../constants';
import { interactionInfo } from '../utils';

import requireAll from 'require-all';
import path from 'path';

type CommandFile = { default: ConstructableCommand };

interface ConstructableCommand {
  new (): Command;
}

export default class Dispatcher {
  public commands: Command[] = [];

  constructor(private client: Client) {
    this.loadCommands();
  }

  public get commandsData(): ApplicationCommandData[] {
    return this.commands.map((command: Command) => command.data);
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const command = this.commands.find((cmd: Command) => cmd.name === interaction.commandName);

    if (!command) {
      await interaction.reply('Commande inexistante !');

      await interaction.guild?.commands.delete(interaction.commandId);
      return;
    }

    if (command.channels && !command.channels.includes(interaction.channelId)) {
      switch (command.channels) {
        case [commandsChannelId]:
          {
            await interaction.reply(
              interactionInfo(`Préférez utiliser cette commande dans le salon ${channelMention(commandsChannelId)}.`)
            );
          }
          break;
        case [suggestionsChannelId, correctionsChannelId]:
          {
            await interaction.reply(
              interactionInfo(
                `Vous ne pouvez pas approuver une suggestion ou une correction en dehors des salons ${channelMention(
                  suggestionsChannelId
                )} et ${channelMention(correctionsChannelId)}.`
              )
            );
          }
          break;
      }
    }

    try {
      await command.run(interaction);
    } catch (error) {
      console.error('[Bot error]', error);
    }
  }

  loadCommands() {
    const directoryFiles = requireAll({
      dirname: path.join(__dirname, '../commands')
    });
    const commandsFiles = Object.values<CommandFile>(directoryFiles);
    this.commands = commandsFiles.map(({ default: commandFile }) => {
      return new commandFile();
    });
  }

  public async register(): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    await guild.commands.set(this.commandsData);

    await guild.members.fetch();
  }
}
