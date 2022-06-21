import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import { randomJokeByType } from '../../controllers';
import { Category, CategoriesRefsFull, Joke } from '../../typings';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo } from '../utils';

export default class JokeCommand extends Command {
  constructor() {
    super({
      name: 'blague',
      description: 'Afficher une blague aléatoire',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.String,
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
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const type = interaction.options.getString('type', true) as Category;

    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser cette commande dans le salon <#${commandsChannelId}>.`)
      );
    }

    const { response: blague } = randomJokeByType(type) as { response: Joke };

    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: blague.joke,
          description: `|| ${blague.answer} ||`,
          timestamp: new Date().toISOString(),
          footer: {
            text: `${CategoriesRefsFull[blague.type]} • (${blague.id})`,
            icon_url: interaction.guild.iconURL({ size: 32 })!
          }
        }
      ]
    });
  }
}
