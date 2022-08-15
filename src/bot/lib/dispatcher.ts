import { ApplicationCommandData, Client, CommandInteraction } from 'discord.js';
import Command from './command';

import CorrectCommand from '../commands/correction';
import SuggestCommand from '../commands/suggest';
import StatsCommand from '../commands/stats';
import JokeCommand from '../commands/joke';
import ApproveCommand from '../commands/approve';
import DisapproveCommand from '../commands/disapprove';
import LeaderboardCommand from '../commands/leaderboard';
import UserStatsCommand from '../commands/userStats';
import IgnoreCommand from '../commands/ignore';
import { commandsChannelId, correctionsChannelId, guildId, suggestionsChannelId } from '../constants';
import { interactionInfo } from '../utils';

export default class Dispatcher {
  constructor(private client: Client) {}

  public get commands(): Command[] {
    return [
      new SuggestCommand(),
      new CorrectCommand(),
      new StatsCommand(),
      new JokeCommand(),
      new ApproveCommand(),
      new DisapproveCommand(),
      new LeaderboardCommand(),
      new UserStatsCommand(),
      new IgnoreCommand()
    ];
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
              interactionInfo(`Préférez utiliser cette commande dans le salon <#${commandsChannelId}>.`)
            );
          }
          break;
        case [suggestionsChannelId, correctionsChannelId]:
          {
            await interaction.reply(
              interactionInfo(
                `Vous ne pouvez pas approuver une suggestion ou une correction en dehors des salons <#${suggestionsChannelId}> et <#${correctionsChannelId}>.`
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

  public async register(): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    await guild.commands.set(this.commandsData);

    await guild.members.fetch();
  }
}
