import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  inlineCode,
  italic,
  spoiler
} from 'discord.js';
import { Categories, CategoriesRefsFull } from '../../typings';
import { Colors, commandsChannelId } from '../constants';
import Command from '../lib/command';
import { checkKeywordsInJoke, randomJoke, randomJokeByKeywords, randomJokeByType } from '../../controllers';
import { interactionInfo } from '../utils';
import Jokes from '../../jokes';

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
          choices: Object.entries(JokeCategories).map(([key, name]) => ({
            name,
            value: key
          }))
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'search',
          description: 'Mots-clés ex: développeur || développeur,métro ',
          nameLocalizations: {
            fr: 'recherche'
          }
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const type = (interaction.options.getString('type') || 'random') as JokeCategory;
    const search = interaction.options.getString('search');

    const joke = await this.findJoke(interaction, type, search);
    if (!joke) return;

    return interaction.reply({
      embeds: [
        {
          color: Colors.PRIMARY,
          title: joke.joke,
          description: spoiler(joke.answer),
          timestamp: new Date().toISOString(),
          footer: {
            text: `${CategoriesRefsFull[joke.type]} • ID ${joke.id}`,
            icon_url: interaction.guild.iconURL({ size: 32 }) ?? undefined
          }
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: ButtonStyle.Primary,
              label: 'Une autre !',
              customId: `cmd:joke:${interaction.user.id}:${type}:${search ?? ''}`
            }
          ]
        }
      ]
    });
  }

  async button(interaction: ButtonInteraction<'cached'>, [userId, type, search]: string[]) {
    const joke = await this.findJoke(interaction, type as JokeCategory, search);
    if (!joke) return;

    const embed = {
      color: Colors.PRIMARY,
      title: joke.joke,
      description: spoiler(joke.answer),
      timestamp: new Date().toISOString(),
      footer: {
        text: `${CategoriesRefsFull[joke.type]} • ID ${joke.id}`,
        icon_url: interaction.guild.iconURL({ size: 32 }) ?? undefined
      }
    };

    if (userId !== interaction.user.id) {
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embeds = interaction.message.embeds.map((e) => e.toJSON());

    embeds.push(embed);

    await interaction.update({ embeds, components: embeds.length < 10 ? interaction.message.components : [] });
  }

  async findJoke(
    interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    type: JokeCategory,
    search: string | null
  ) {
    if (!search) {
      const { response: joke } = type === 'random' ? randomJoke() : randomJokeByType(type);

      return joke ?? null;
    }

    const keyswords = search.split(',');

    const { response: joke } = randomJokeByKeywords(keyswords, type === 'random' ? undefined : type);

    if (!joke) {
      if (type === 'random') {
        await interaction.reply(
          interactionInfo(
            `Aucune blague correspondant à la recherche ${inlineCode(keyswords.join(', '))} n'existe dans l'API.`
          )
        );

        return null;
      }

      const filtredJokes = Jokes.list.filter((joke) => checkKeywordsInJoke(joke, keyswords));
      const availableCategories = Categories.filter((category) => filtredJokes.some((joke) => joke.type === category));

      await interaction.reply(
        interactionInfo(
          `Aucune blague de type ${inlineCode(CategoriesRefsFull[type])} correspondant à la recherche ${inlineCode(
            keyswords.join(', ')
          )} n'a été trouvée.\n\n${
            ':information_source: ' +
            italic(
              `Une ou plusieurs blagues correspondant à cette recherche existent en type${
                availableCategories.length > 1 ? 's ' : ' '
              }${
                availableCategories
                  .slice(0, availableCategories.length - 1)
                  .map((type: string) => inlineCode(JokeCategories[type as JokeCategory]))
                  .join(', ') + (availableCategories.length > 1 ? ' et ' : ' ')
              }${inlineCode(JokeCategories[availableCategories.pop()!])}.`
            )
          }`
        )
      );

      return null;
    }

    return joke;
  }
}
