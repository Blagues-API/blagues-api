import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  inlineCode,
  italic,
  spoiler
} from 'discord.js';
import { Categories, CategoriesRefsFull, Category, Joke } from '../../typings';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { JokesByKeyword, randomJoke, randomJokeByKeyword, randomJokeByType } from '../../controllers';
import { interactionInfo } from '../utils';

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
    const keyword = interaction.options.getString('search');

    if (keyword) return this.jokeByKeyword(interaction, keyword, type);
    else return this.randomJoke(interaction, type);
    // TODO: Add button to send another joke
  }

  async jokeByKeyword(interaction: ChatInputCommandInteraction<'cached'>, keyword: string, type: JokeCategory) {
    const joke = (type === 'random' ? randomJokeByKeyword(keyword) : randomJokeByKeyword(keyword, type))['response'];

    if (!joke) {
      if (type === 'random') {
        return interaction.reply(
          interactionInfo(`Aucune blague correspondant à la recherche ${inlineCode(keyword)} n'existe dans l'API.`)
        );
      }

      const possiblesJoke = JokesByKeyword(keyword);

      const availableTypes: Category[] = [];

      possiblesJoke.forEach((joke: Joke) => {
        if (!availableTypes.includes(joke.type)) availableTypes.push(joke.type);
      });
      availableTypes.sort((a, b) => Categories.indexOf(a) - Categories.indexOf(b));

      return interaction.reply(
        interactionInfo(
          `Aucune blague de type ${inlineCode(CategoriesRefsFull[type])} correspondant à la recherche ${inlineCode(
            keyword
          )} n'a été trouvée.\n\n${
            ':information_source: ' +
            italic(
              `Une ou plusieurs blagues correspondant à cette recherche existent en type${
                availableTypes.length > 1 ? 's ' : ' '
              }${
                availableTypes
                  .slice(0, availableTypes.length - 1)
                  .map((type: string) => inlineCode(JokeCategories[type as JokeCategory]))
                  .join(', ') + (availableTypes.length > 1 ? ' et ' : ' ')
              }${inlineCode(JokeCategories[availableTypes.pop()!])}.`
            )
          }`
        )
      );
    }

    return this.sendJoke(interaction, joke);
  }

  async randomJoke(interaction: ChatInputCommandInteraction<'cached'>, type: JokeCategory) {
    const joke = type === 'random' ? randomJoke()['response']! : randomJokeByType(type)['response']!;

    return this.sendJoke(interaction, joke);
  }

  async sendJoke(interaction: ChatInputCommandInteraction<'cached'>, joke: Joke) {
    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: joke.joke,
          description: spoiler(joke.answer),
          timestamp: new Date().toISOString(),
          footer: {
            text: `${CategoriesRefsFull[joke.type]} • (${joke.id})`,
            icon_url: interaction.guild.iconURL({ size: 32 }) ?? undefined
          }
        }
      ]
    });
  }
}
