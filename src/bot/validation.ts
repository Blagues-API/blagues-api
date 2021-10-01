import {
  Client,
  CommandInteraction,
  ContextMenuInteraction,
  TextChannel
} from 'discord.js';
import { Constants } from 'discord.js';
import { promises as fs, constants as fsConstants } from 'fs';
import {
  Category,
  CategoryName,
  Joke,
  JokeTypesRefsReverse,
  UnsignedJoke
} from '../typings';
import {
  everyoneRole,
  parrainRole,
  guildId,
  suggestsChannel
} from './constants';
import path from 'path';
import prisma from '../prisma';
import {
  interactionError,
  interactionInfo,
  interactionValidate
} from './utils';
import FriendlyError from './errors/FriendlyError';

export default class Validation {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async register(): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const cmd = await guild.commands.create({
      name: 'Approuver',
      type: Constants.ApplicationCommandTypes.MESSAGE
    });

    await cmd!.permissions.add({
      permissions: [
        {
          id: everyoneRole,
          type: Constants.ApplicationCommandPermissionTypes.ROLE,
          permission: false
        },
        {
          id: parrainRole,
          type: Constants.ApplicationCommandPermissionTypes.ROLE,
          permission: true
        }
      ]
    });
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const message = await (interaction.channel as TextChannel)?.messages.fetch(
      (interaction as ContextMenuInteraction).targetId
    );
    if (suggestsChannel !== interaction.channel?.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez pas valider une blague en dehors du salon <#${suggestsChannel}>.`
        )
      );
    }
    if (message.author.id !== this.client.user!.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez valider une blague qui n'est pas gérée par ${this.client.user}.`
        )
      );
    }
    const embed = message.embeds[0];
    if (!embed?.description) {
      return interaction.reply(interactionError(`Le message est invalide.`));
    }

    const validations = await prisma.validation.findMany({
      where: {
        message_id: message.id
      }
    });

    if (embed.color === 0x00ff00) {
      return interaction.reply(
        interactionError(`Cette blague a déjà été ajoutée.`)
      );
    }

    if (
      validations.some(
        (validation) => validation.user_id === interaction.user.id
      )
    ) {
      return interaction.reply(
        interactionInfo(`Vous avez déjà approuvé cette blague.`)
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

    const args = [...embed.description.matchAll(/:\s(.+)/g)];
    const joke: UnsignedJoke = {
      type: JokeTypesRefsReverse[args[0][1] as CategoryName] as Category,
      joke: args[1][1],
      answer: args[2][1]
    };

    try {
      await this.addJoke(joke);
    } catch (error) {
      if (error instanceof FriendlyError) {
        return interaction.reply(
          interactionError(
            `Il semblerait que le fichier de blagues soit inaccessible ou innexistant.`
          )
        );
      }
      return interaction.reply(
        interactionError(
          `Une erreur s'est produite lors de l'ajout de la blague.`
        )
      );
    }

    embed.color = 0x00ff00;
    embed.footer!.text = 'Blague ajoutée';

    message.edit({ embeds: [embed] });
  }

  async addJoke(unsignedJoke: UnsignedJoke): Promise<void> {
    const jokesPath = path.join(__dirname, '../../blagues.json');
    try {
      await fs.access(jokesPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      console.log('Missing access', error);
      throw new FriendlyError(403, 'Missing access');
    }

    try {
      const rawData = await fs.readFile(jokesPath, 'utf-8');
      const data = (rawData.length ? JSON.parse(rawData) : []) as Joke[];
      const id = data[data.length - 1].id + 1;
      data.push({ id, ...unsignedJoke } as Joke);
      await fs.writeFile(jokesPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('Error:', error);
      throw error;
    }
  }
}
