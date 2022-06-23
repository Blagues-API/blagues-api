import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import { commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo } from '../utils';
import Stats from '../modules/stats';

export default class SuggestCommand extends Command {
  constructor() {
    super({
      name: 'stats',
      description: 'Voir les statistiques',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'Utilisateur dont vous voulez les statistiques'
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

    if (interaction.options.get('user')) {
      return Stats.userStats(interaction, false);
    }

    return Stats.globalStats(interaction);
  }
}
