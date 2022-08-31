import Command from '../lib/command';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Message,
  roleMention
} from 'discord.js';
import { buildJokeDisplay, interactionInfo, interactionValidate, waitForInteraction } from '../utils';
import { CategoriesRefs } from '../../typings';
import { jokeById, jokeByQuestion } from '../../controllers';
import { Colors } from '../constants';
import Jokes from '../../jokes';
import prisma from '../../prisma';

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
    if (interaction.user.id !== '207190782673813504') {
      await interaction.reply(
        interactionInfo(`Seul le ${roleMention('698914163677724753')} du bot peut exécuter cette commande.`)
      );
    }

    const query = interaction.options.getString('recherche', true);
    const joke = isNaN(Number(query)) ? jokeByQuestion(query)! : jokeById(Number(query))!;

    const embed: APIEmbed = {
      author: {
        icon_url: interaction.user.displayAvatarURL({
          size: 32
        }),
        name: interaction.user.tag
      },
      description: buildJokeDisplay(CategoriesRefs[joke.type], joke.joke, joke.answer),
      color: Colors.PROPOSED
    };

    const message = (await interaction.reply({
      content: 'Confirmez-vous vouloir supprimer la blague suivante ?',
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Supprimer',
              customId: 'delete',
              style: ButtonStyle.Danger
            },
            {
              type: ComponentType.Button,
              label: 'Annuler',
              customId: 'cancel',
              style: ButtonStyle.Secondary
            }
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    })) as Message<true>;

    const confirmation = await waitForInteraction({
      component_type: ComponentType.Button,
      message: message,
      user: interaction.user
    });

    if (!confirmation) return;

    if (confirmation.customId === 'cancel') {
      return confirmation.update({
        content: "La blague n'a pas été envoyée.",
        components: [],
        embeds: [embed]
      });
    }

    const { success } = await Jokes.deleteJoke(joke);
    if (!success) return;

    interaction.client.refreshStatus();

    await prisma.proposal.delete({
      where: { joke_id: joke.id }
    });

    return confirmation.update(interactionValidate('La blague a bien été supprimée !', true));
  }
}
