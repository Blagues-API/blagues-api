import {
  CommandInteraction,
  ContextMenuInteraction,
  Message,
  MessageEmbed,
  TextChannel
} from 'discord.js';
import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import prisma from '../../prisma';
import {
  Category,
  CategoryName,
  Joke,
  JokeTypesRefsReverse,
  UnsignedJoke
} from '../../typings';
import { correctionChannel, suggestsChannel } from '../constants';
import Command from '../lib/command';
import {
  interactionError,
  interactionInfo,
  interactionValidate
} from '../utils';

export default class ApproveCommand extends Command {
  constructor() {
    super({
      name: 'Approuver',
      type: 'MESSAGE',
      parrainOnly: true
    });
  }

  async run(interaction: CommandInteraction): Promise<void> {
    const channel = (interaction.channel as TextChannel)!;
    const isSuggestion = channel.id === suggestsChannel;
    const message = await channel.messages.fetch(
      (interaction as ContextMenuInteraction).targetId
    );
    if (![suggestsChannel, correctionChannel].includes(channel.id)) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez pas valider une blague ou une correction en dehors des salons <#${suggestsChannel}> et <#${correctionChannel}>.`
        )
      );
    }
    if (message.author.id !== interaction.client.user!.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez valider une ${
            isSuggestion ? 'blague' : 'correction'
          } qui n'est pas gérée par ${interaction.client.user}.`
        )
      );
    }
    const embed = message.embeds[0];
    if (!embed?.description) {
      return interaction.reply(interactionError(`Le message est invalide.`));
    }

    // TODO: Vérifier lorsque c'est une correction si une suggestion est en cours

    const validations = await prisma.validation.findMany({
      where: {
        message_id: message.id
      }
    });

    if (embed.color === 0x00ff00) {
      return interaction.reply(
        interactionError(
          `Cette ${isSuggestion ? 'blague' : 'correction'} a déjà été ajoutée.`
        )
      );
    }

    if (
      validations.some(
        (validation) => validation.user_id === interaction.user.id
      )
    ) {
      return interaction.reply(
        interactionInfo(
          `Vous avez déjà approuvé cette ${
            isSuggestion ? 'blague' : 'correction'
          }.`
        )
      );
    }

    await prisma.validation.create({
      data: {
        message_id: message.id,
        user_id: interaction.user.id
      }
    });

    if (validations.length < 2) {
      const missingValidations = 2 - validations.length;
      embed.footer!.text = `${missingValidations} approbation${
        missingValidations > 1 ? 's' : ''
      } manquantes avant l'ajout`;

      await message.edit({ embeds: [embed] });

      return interaction.reply(
        interactionValidate(`Votre approbation a été prise en compte !`)
      );
    }

    // TODO: Vérifier lorsque c'est une correction si une suggestion dépend de cette dernière

    return isSuggestion
      ? this.addSuggestion(interaction, message, embed)
      : this.correctJoke();
  }

  async addSuggestion(
    interaction: CommandInteraction,
    message: Message,
    embed: MessageEmbed
  ): Promise<void> {
    const args = [...embed.description!.matchAll(/:\s(.+)/g)];
    const joke: UnsignedJoke = {
      type: JokeTypesRefsReverse[args[0][1] as CategoryName] as Category,
      joke: args[1][1],
      answer: args[2][1]
    };

    await this.addJoke(interaction, joke);

    embed.color = 0x00ff00;
    embed.footer!.text = 'Blague ajoutée';

    await message.edit({ embeds: [embed] });
  }

  async correctJoke(): Promise<void> {
    // TODO: Correction
  }

  async addJoke(
    interaction: CommandInteraction,
    partialJoke: Partial<Joke>
  ): Promise<boolean> {
    const jokesPath = path.join(__dirname, '../../../blagues.json');
    try {
      await fs.access(jokesPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      console.log('Missing access', error);
      await interaction.reply(
        interactionError(
          `Il semblerait que le fichier de blagues soit inaccessible ou innexistant.`
        )
      );
      return false;
    }

    try {
      const rawData = await fs.readFile(jokesPath, 'utf-8');
      const data = (rawData.length ? JSON.parse(rawData) : []) as Joke[];

      const index =
        'id' in partialJoke
          ? data.findIndex((joke) => joke.id === partialJoke.id)
          : data.length - 1;
      const joke = {
        ...partialJoke,
        id: partialJoke.id ?? data[data.length - 1].id + 1
      } as Joke;
      data.splice(index, partialJoke.id ? 1 : 0, joke);

      await fs.writeFile(jokesPath, JSON.stringify(data, null, 2));

      return true;
    } catch (error) {
      console.log('Error:', error);

      await interaction.reply(
        interactionError(
          `Une erreur s'est produite lors de l'ajout de la blague.`
        )
      );
      return false;
    }
  }
}
