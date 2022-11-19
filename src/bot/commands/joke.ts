import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  inlineCode,
  italic,
  spoiler
} from 'discord.js';
import { CategoriesRefsFull } from '../../typings';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { jokeByKeyword, randomJoke, randomJokeByType } from '../../controllers';
import { interactionProblem } from 'bot/utils';

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
      return interaction.reply(
        interactionProblem(
          `Aucune blague${
            type === 'random' ? '' : ` de type ${inlineCode(CategoriesRefsFull[type])}`
          } correspondant à la recherche ${inlineCode(keyword)} n'a été trouvée.${
            type === 'random'
              ? ''
              : `\n\n:information_source: ${italic(
                  'Définir le type de blagues en "Aléatoire" règlera peut-être ce problème.'
                )}`
          }`
        )
      );
      // TODO : check si la recherche aboutit peu importe le type de blagues (et si possible, les indiquer)
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
