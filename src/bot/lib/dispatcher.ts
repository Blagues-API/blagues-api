import { Client, CommandInteraction } from 'discord.js';
import Command, { AppCommandData } from './command';

import CorrectCommand from '../commands/correction';
import SuggestCommand from '../commands/suggest';
import StatsCommand from '../commands/stats';
import JokeCommand from '../commands/joke';
import ApproveCommand from '../commands/approve';
import DisapproveCommand from '../commands/disapprove';
import LeaderboardCommand from '../commands/leaderboard';
import UserStatsCommand from '../commands/userStats';
import { commandsChannelId, correctionsChannelId, guildId, suggestionsChannelId } from '../constants';
import { interactionInfo, interactionProblem } from '../utils';

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
      new JokeCommand(),
      new ApproveCommand(),
      new DisapproveCommand(),
      new LeaderboardCommand(),
      new UserStatsCommand()
    ];
  }

  public get commandsData(): AppCommandData[] {
    return this.commands.map((command: Command) => command.data);
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const command = this.commands.find((cmd: Command) => cmd.name === interaction.commandName);

    if (!command) {
      await interaction.reply('Commande inexistante !');

      await interaction.guild?.commands.delete(interaction.commandId);
      return;
    }

    if (!command.data.channels?.includes(interaction.channelId)) {
      if (command.data.channels?.includes(commandsChannelId)) {
        await interaction.reply(
          interactionInfo(`Préférez utiliser cette commande dans le salon <#${commandsChannelId}>.`)
        );
        return;
      } else if (command.data.channels?.includes(suggestionsChannelId || correctionsChannelId)) {
        await interaction.reply(
          interactionProblem(
            `Vous ne pouvez pas approuver une suggestion ou une correction en dehors des salons <#${suggestionsChannelId}> et <#${correctionsChannelId}>.`
          )
        );
        return;
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
