import { Client, CommandInteraction, ContextMenuInteraction, TextChannel } from 'discord.js'
import { jokesCount, jokesFile } from '../controllers';
import { writeFile } from 'fs'
import { Category, Joke } from '../typings';
import { everyoneRole, parrainRole } from './constants';
import path from 'path';

export default class Validation {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async register(): Promise<void> {
    const cmd = await this.client.application?.commands.create({
      name: 'Validation',
      type: 3
    })

   await cmd!.permissions.add({guild: '642681003642716160' , permissions: [
      {
        id: everyoneRole,
        type: 1,
        permission: false,
      },
      {
        id: parrainRole,
        type: 1,
        permission: true,
      }]
    })
  }

  public async execute(interaction: CommandInteraction): Promise<void> {
    const message = await (interaction.channel as TextChannel)?.messages.fetch((interaction as ContextMenuInteraction).targetId)
    if(message.embeds.length === 0) return
    const description = message.embeds[0].description as string
    const args = [...description.matchAll(/:\s(.+)/g)]
    const joke: Joke = {
      id: jokesCount + 1,
      type: args[0][1] as Category,
      joke: args[1][1],
      answer: args[2][1]
    }
    jokesFile.push(joke)
    writeFile(path.join(__dirname, '..', '..', 'blagues.json'), JSON.stringify(jokesFile, null, 2), () => {
      message.embeds[0].color = 0x00FF00
      message.edit({embeds: message.embeds})
    })
  }
}
