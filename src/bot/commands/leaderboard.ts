import { ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import Command from '../lib/command';
import Stats from '../modules/stats';
import { commandsChannelId } from '../constants';

export default class LeaderboardCommand extends Command {
  constructor() {
    super({
      name: 'leaderboard',
      nameLocalizations: {
        fr: 'classement'
      },
      description: 'Afficher les statistiques',
      type: ApplicationCommandType.ChatInput,
      channels: [commandsChannelId]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    return Stats.globalStats(interaction);
  }
}
