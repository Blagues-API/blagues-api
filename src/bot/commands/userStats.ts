import Command from 'bot/lib/command';
import { ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import stats from '../modules/stats';

export default class UserStatsCommand extends Command {
  constructor() {
    super({
      name: 'Statistiques',
      type: ApplicationCommandType.User
    });
  }

  async run(interaction: UserContextMenuCommandInteraction) {
    return stats.userStats(interaction, true);
  }
}
