import Command from '../lib/command';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  bold,
  ButtonStyle,
  ChatInputCommandInteraction,
  codeBlock,
  ComponentType,
  TextChannel
} from 'discord.js';
import { buildJokeDisplay, interactionProblem, interactionValidate, isEmbedable, waitForInteraction } from '../utils';
import { CategoriesRefs } from '../../typings';
import { jokeById, jokeByQuestion } from '../../controllers';
import { Colors, logsChannelId } from '../constants';
import Jokes from '../../jokes';
import prisma from '../../prisma';
import { stripIndents } from 'common-tags';

export default class DeleteCommand extends Command {
  constructor() {
    super({
      name: 'delete',
      description: 'Supprimer une blague',
      type: ApplicationCommandType.ChatInput,
      defaultMemberPermissions: 'Administrator',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'query',
          nameLocalizations: { fr: 'recherche' },
          description: 'ID ou question de la blague',
          required: true
        }
      ]
    });
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const query = interaction.options.getString('query', true);
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

    const message = await interaction.reply({
      content: 'Voulez-vous vraiment supprimer la blague suivante ?',
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Oui',
              customId: 'yes',
              style: ButtonStyle.Success
            },
            {
              type: ComponentType.Button,
              label: 'Non',
              customId: 'no',
              style: ButtonStyle.Danger
            }
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    });

    const confirmation = await waitForInteraction({
      componentType: ComponentType.Button,
      message: message,
      user: interaction.user
    });

    if (!confirmation) return;

    if (confirmation.customId === 'no') {
      return confirmation.update({
        content: 'La suppression de la blague a bien été annulée.',
        components: [],
        embeds: [embed]
      });
    }

    const { success, error } = await Jokes.deleteJoke(joke);

    if (!success)
      return confirmation.update(
        interactionProblem(
          stripIndents`
            La blague n'a pas pu être supprimée !
            ${error ? `${bold('Erreur :')}${codeBlock(error)}` : ''}
          `,
          true
        )
      );

    await prisma.proposal.delete({
      where: { joke_id: joke.id }
    });

    const logsChannel = interaction.client.channels.cache.get(logsChannelId) as TextChannel;

    if (isEmbedable(logsChannel)) {
      await logsChannel.send({
        content: "Blague retirée de l'API",
        embeds: [embed]
      });
    }

    interaction.client.refreshStatus();

    interaction.client.summary.askReload();

    return confirmation.update(interactionValidate('La blague a bien été supprimée !', true));
  }
}
