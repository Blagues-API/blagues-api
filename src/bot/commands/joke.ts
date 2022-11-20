import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  inlineCode,
  italic,
  spoiler
} from 'discord.js';
import { Categories, CategoriesRefsFull, Joke } from '../../typings';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { jokeByKeyword, randomJoke, randomJokeByType } from '../../controllers';
import { interactionInfo } from '../utils';
import Jokes from '../../jokes';
import { compareTwoStrings } from 'string-similarity';

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
    const keyword = interaction.options.getString('search', false);

    const joke = keyword
      ? jokeByKeyword(keyword, type)!
      : type === 'random'
      ? randomJoke().response!
      : randomJokeByType(type).response!;

    if (!joke && keyword) {
      if (jokeByKeyword(keyword, 'random')) {
        const availableTypes: JokeCategory[] = [];

        Jokes.list.forEach((joke: Joke) => {
          if (
            `${joke.joke} ${joke.answer}`
              .toLowerCase()
              .split(' ')
              .filter((word: string) => compareTwoStrings(word, keyword.toLowerCase()) > 0.95).length !== 0
          ) {
            Categories.forEach((category: string) => {
              if (joke.type === category && !availableTypes.includes(category)) {
                availableTypes.push(category);
              }
            });
          }
        });

        return interaction.reply(
          interactionInfo(
            `Aucune blague${
              type === 'random' ? '' : ` de type ${inlineCode(CategoriesRefsFull[type])}`
            } correspondant à la recherche ${inlineCode(keyword)} n'a été trouvée.\n\n${
              type !== 'random'
                ? ':information_source: ' +
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
                : ''
            }`
          )
        );
      }
      return interaction.reply(
        interactionInfo(`Aucune blague correspondant à la recherche ${inlineCode(keyword)} n'existe dans l'API.`)
      );
    }

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

    // TODO: Add button to send another joke
  }
}
