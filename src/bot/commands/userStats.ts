import Command from '../lib/command';
import { ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import Stats from '../modules/stats';

export default class UserStatsCommand extends Command {
  constructor() {
    super({
      name: 'Statistiques',
      type: ApplicationCommandType.User
    });
  }

  async run(interaction: UserContextMenuCommandInteraction<'cached'>) {
    return Stats.userStats(interaction, interaction.targetMember, true);
  }
}
