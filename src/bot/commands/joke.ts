import { CommandInteraction } from 'discord.js';
import { randomJokeByType } from '../../controllers';
import { Category, CategoriesRefsFull } from '../../typings';
import { Colors, commandsChannel } from '../constants';
import Command from '../lib/command';
import { interactionInfo } from '../utils';

export default class JokeCommand extends Command {
  constructor() {
    super({
      name: 'blague',
      description: 'Afficher une blague aléatoire',
      type: 'CHAT_INPUT',
      options: [
        {
          type: 'STRING',
          name: 'type',
          description: 'Général, Développeur, Noir, +18, Beauf, Blondes',
          required: true,
          choices: Object.entries(CategoriesRefsFull).map(([key, name]) => ({
            name,
            value: key
          }))
        }
      ]
    });
  }
  async run(interaction: CommandInteraction): Promise<void> {
    const type = interaction.options.getString('type', true) as Category;

    if (interaction.channelId !== commandsChannel) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser cette commande dans le salon <#${commandsChannel}>.`)
      );
    }

    const { response: blague } = randomJokeByType(type);

    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: blague!.joke,
          description: `|| ${blague!.answer} ||`,
          timestamp: Date.now(),
          footer: {
            text: CategoriesRefsFull[blague!.type],
            icon_url: interaction.guild!.iconURL({ size: 32, dynamic: true })!
          }
        }
      ]
    });
  }
}
