import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, spoiler } from 'discord.js';
import JokesLoader from '../../jokes';
import { CategoriesRefsFull } from '../../typings';
import { random } from '../../utils';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';

const JokeCategories = {
  random: 'Aléatoire',
  ...CategoriesRefsFull
};

type JokeCategory = keyof typeof JokeCategories;

export default class JokeCommand extends Command {
  constructor() {
    super({
      name: 'joke',
      nameLocalizations: {
        fr: 'blague'
      },
      description: 'Afficher une blague aléatoire',
      type: ApplicationCommandType.ChatInput,
      channels: [commandsChannelId],
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'type',
          description: 'Type de blague',
          required: true,
          choices: Object.entries(JokeCategories).map(([key, name]) => ({
            name,
            value: key
          }))
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const type = interaction.options.getString('type', true) as JokeCategory;

    const blague = random(type === 'random' ? JokesLoader.list : JokesLoader.list.filter((joke) => joke.type === type));

    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: blague.joke,
          description: spoiler(blague.answer),
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
