import { ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import { commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo } from '../utils';
import Stats from '../modules/stats';

export default class LeaderboardCommand extends Command {
  constructor() {
    super({
      name: 'leaderbord',
      description: 'Afficher les statistiques',
      type: ApplicationCommandType.ChatInput
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }
    return Stats.globalStats(interaction);
  }
}
