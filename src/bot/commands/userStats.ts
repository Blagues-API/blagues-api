import Command from '../lib/command';
import { ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import Stats from '../modules/stats';
import { interactionProblem } from '../utils';

export default class UserStatsCommand extends Command {
  constructor() {
    super({
      name: 'Statistics',
      nameLocalizations: {
        fr: 'Statistiques'
      },
      type: ApplicationCommandType.User
    });
  }

  async run(interaction: UserContextMenuCommandInteraction<'cached'>) {
    if (!interaction.targetMember) {
      return interaction.reply(interactionProblem("L'utilisateur n'est pas dans ce serveur."));
    }
    return Stats.userStats(interaction, interaction.targetMember, true);
  }
}
