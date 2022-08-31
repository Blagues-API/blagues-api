import Command from '../lib/command';
import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';

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
    interaction; // To avoid typescript errors
  }
}
