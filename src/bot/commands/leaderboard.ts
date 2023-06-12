import { ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import { commandsChannelId } from '../constants';
import Command from '../lib/command';
import { Stats } from '../modules';

export default class LeaderboardCommand extends Command {
  constructor() {
    super({
      name: 'leaderboard',
      nameLocalizations: {
        fr: 'classement'
      },
      description: 'Afficher les statistiques globales du serveur',
      type: ApplicationCommandType.ChatInput,
      channels: [commandsChannelId]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    return Stats.globalStats(interaction);
  }
}
