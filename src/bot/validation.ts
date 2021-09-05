import {
  Client,
  CommandInteraction,
  ContextMenuInteraction,
  TextChannel
} from 'discord.js';
import { Constants } from 'discord.js';
import { jokesCount, jokesFile } from '../controllers';
import { writeFile } from 'fs';
import { Category, Joke } from '../typings';
import {
  everyoneRole,
  parrainRole,
  guildId,
  suggestsChannel
} from './constants';
import path from 'path';
import prisma from '../prisma';
import { interactionError } from './utils';

export default class Validation {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async register(): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const cmd = await guild.commands.create({
      name: 'Validation',
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
    if (message.author.id !== this.client.user!.id) {
      return interaction.reply(
        interactionError(
          `Vous ne pouvez valider une blague qui n'est pas gérée par ${this.client.user}.`
        )
      );
    }

    await prisma.validation.create({
      data: {
        message_id: message.id,
        user_id: interaction.user.id
      }
    });

    const description = message.embeds[0].description as string;
    const args = [...description.matchAll(/:\s(.+)/g)];
    const joke: Joke = {
      id: jokesCount + 1,
      type: args[0][1] as Category,
      joke: args[1][1],
      answer: args[2][1]
    };

    jokesFile.push(joke);
    writeFile(
      path.join(__dirname, '..', '..', 'blagues.json'),
      JSON.stringify(jokesFile, null, 2),
      () => {
        message.embeds[0].color = 0x00ff00;
        message.edit({ embeds: message.embeds });
      }
    );
  }
}
