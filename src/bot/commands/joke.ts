import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction } from 'discord.js';
import JokesLoader from '../../jokes';
import { Category, CategoriesRefsFull } from '../../typings';
import { random } from '../../utils';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { interactionInfo } from '../utils';

const CategoriesList = {
  random: 'Aléatoire',
  ...CategoriesRefsFull
};

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
          description: 'Aléatoire, Général, Développeur, Noir, +18, Beauf, Blondes',
          required: true,
          choices: Object.entries(CategoriesList).map(([key, name]) => ({
            name,
            value: key
          }))
        }
      ]
    });
  }
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const type = interaction.options.getString('type', true) as Category | 'random';

    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser cette commande dans le salon <#${commandsChannelId}>.`)
      );
    }

    const blague = random(type === 'random' ? JokesLoader.list : JokesLoader.list.filter((joke) => joke.type === type));

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
