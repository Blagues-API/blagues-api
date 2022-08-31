import Command from '../lib/command';
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  roleMention
} from 'discord.js';
import { interactionInfo } from '../utils';

export default class DeleteCommand extends Command {
  constructor() {
    super({
      name: 'delete',
      description: 'Supprimer une blague',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'recherche',
          description: 'ID ou question de la blague',
          required: true
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.user.id !== '207190782673813504') {
      await interaction.reply(
        interactionInfo(`Seul le ${roleMention('698914163677724753')} du bot peut exécuter cette commande.`)
      );
    }
  }
}
