import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import Command from '../lib/command';
import { interactionProblem } from '../utils';
import { Stats } from '../modules/stats';
import { commandsChannelId } from '../constants';

export default class StatsCommand extends Command {
  constructor() {
    super({
      name: 'stats',
      description: "Afficher les statistiques d'un utilisateur",
      type: ApplicationCommandType.ChatInput,
      channels: [commandsChannelId],
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          nameLocalizations: { fr: 'utilisateur' },
          description: 'Utilisateur dont vous voulez les statistiques',
          required: false
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.options.get('user') && !interaction.options.getMember('user')) {
      return interaction.reply(interactionProblem("L'utilisateur n'est pas dans ce serveur."));
    }

    const member = interaction.options.getMember('user') || interaction.member;
    return Stats.userStats(interaction, member, false);
  }
}
