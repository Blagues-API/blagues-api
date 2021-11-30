import { stripIndents } from 'common-tags';
import { Client, Snowflake, TextChannel, MessageOptions } from 'discord.js';
import { correctionsChannel, suggestsChannel } from '../constants';
import Jokes from '../../jokes';

export default class Stickys {
  public client: Client;

  constructor(client: Client) {
    this.client = client;

    setInterval(() => this.sticky(suggestsChannel, this.suggestsMessage()), 10000);
    setInterval(() => this.sticky(correctionsChannel, this.correctionsMessage()), 10000);
  }

  suggestsMessage() {
    return {
      embeds: [
        {
          title: 'Bienvenue à toi ! 👋',
          description: stripIndents`
            Si tu le souhaites, tu peux proposer tes blagues afin qu'elles soient ajoutées à l'API Blagues-API, elle regroupe actuellement **${Jokes.count}** blagues françaises.
            Elles sont toutes issues de ce salon proposées par la communauté.

            > \`/suggestion\`
          `,
          color: 0x0067ad
        }
      ]
    };
  }

  correctionsMessage() {
    return {
      embeds: [
        {
          title: 'Bienvenue à toi ! 👋',
          description: stripIndents`
            Si tu le souhaites, tu peux proposer des corrections aux blagues de l'API Blagues API qui regroupe actuellement **${Jokes.count}** blagues françaises.

            > \`/correction\`
          `,
          color: 0x0067ad
        }
      ]
    };
  }

  async sticky(targetChannel: Snowflake, messagePayload: MessageOptions) {
    const channel = this.client.channels.cache.get(targetChannel) as TextChannel;
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (!messages) return;

    const message = messages.find((m) => m.author.id === this.client.user!.id);
    const last_message = messages.first();
    if (!message || !last_message || message.id !== last_message.id) {
      if (message) await message.delete();

      return channel.send(messagePayload);
    }
  }
}
