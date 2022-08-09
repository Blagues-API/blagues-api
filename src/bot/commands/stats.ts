import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import { commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo, interactionProblem } from '../utils';
import Stats from '../modules/stats';

export default class StatsCommand extends Command {
  constructor() {
    super({
      name: 'stats',
      description: "Afficher les statistiques d'un utilisateur",
      type: ApplicationCommandType.ChatInput,
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
    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }

    if (interaction.options.get('user') && !interaction.options.getMember('user')) {
      return interaction.reply(interactionProblem("L'utilisateur n'est pas dans ce serveur."));
    }

    const member = interaction.options.getMember('user') || interaction.member;
    return Stats.userStats(interaction, member, false);
  }
}
