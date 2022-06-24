import { ApplicationCommandType, ApplicationCommandOptionType /*, ChatInputCommandInteraction */ } from 'discord.js';
import Command from '../lib/command';

export default class StatsCommand extends Command {
  constructor() {
    super({
      name: 'stats',
      description: 'Voir les statistiques',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'utilisatreur',
          description: 'Utilisateur dont vous souhaitez voir les statistiques'
        }
      ]
    });
  }
  async run(/*interaction: ChatInputCommandInteraction*/) {
    return;
  }
}
