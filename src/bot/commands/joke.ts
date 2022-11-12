import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, spoiler } from 'discord.js';
import JokesLoader from '../../jokes';
import { CategoriesRefsFull } from '../../typings';
import { random } from '../../utils';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { findBestMatch } from 'string-similarity';
import { jokeById } from '../../controllers';

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
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'search',
          description: 'truc',
          nameLocalizations: {
            fr: 'recherche'
          }
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const type = interaction.options.getString('type', true) as JokeCategory;
    const keyword = interaction.options.getString('keyword', true);

    const jokeString = random(
      findBestMatch(
        keyword,
        type === 'random'
          ? JokesLoader.list.map((joke) => `${joke.joke}${joke.answer}|${joke.id}`)
          : JokesLoader.list.filter((joke) => joke.type === type).map((joke) => `${joke.joke}${joke.answer}|${joke.id}`)
      ).ratings
    ).target;

    const joke = jokeString
      ? jokeById(+jokeString.split('|')[1])!
      : random(type === 'random' ? JokesLoader.list : JokesLoader.list.filter((joke) => joke.type === type));

    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: joke.joke,
          description: spoiler(joke.answer),
          timestamp: new Date().toISOString(),
          footer: {
            text: `${CategoriesRefsFull[joke.type]} • (${joke.id})`,
            icon_url: interaction.guild.iconURL({ size: 32 })!
          }
        }
      ]
    });
  }
}
