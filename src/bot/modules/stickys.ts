import { stripIndents } from 'common-tags';
import { Client, Snowflake, TextChannel, APIEmbed, Message } from 'discord.js';
import { commandsChannelId, correctionsChannelId, suggestionsChannelId } from '../constants';
import Jokes from '../../jokes';

export default class Stickys {
  public client: Client;
  private messages: Record<string, APIEmbed>;

  constructor(client: Client) {
    this.client = client;

    this.messages = {
      [suggestionsChannelId]: this.suggestsMessage(),
      [correctionsChannelId]: this.correctionsMessage()
    };
  }

  async run(message: Message<true>) {
    if (process.env.bot_stickies === 'false') return;
    if (!(message.channelId in this.messages)) return;

    return this.check(suggestionsChannelId, this.messages[message.channelId]);
  }

  private async check(targetChannel: Snowflake, embed: APIEmbed) {
    const channel = this.client.channels.cache.get(targetChannel) as TextChannel;
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (!messages) return;

    const message = messages.find((m) => m.author.id === this.client.user!.id && m.embeds?.[0]?.title === embed.title);
    const last_message = messages.first();
    if (!message || !last_message || message.id !== last_message.id) {
      if (message) await message.delete();

      await channel.send({ embeds: [embed] });
    }
  }

  suggestsMessage(): APIEmbed {
    return {
      title: 'Bienvenue à toi ! 👋',
      description: stripIndents`
        Si tu le souhaites, tu peux proposer tes blagues afin qu'elles soient ajoutées à l'API Blagues-API, elle regroupe actuellement **${Jokes.count}** blagues françaises.
        Elles sont toutes issues de ce salon proposées par la communauté.

        > \`/suggestion\` dans le salon <#${commandsChannelId}>
      `,
      fields: [
        {
          name: 'Règles:',
          value: stripIndents`
            > - Espace avant les caractères: \`?\` et \`!\`.
            > - Ponctuation de fin de phrase si elle contient un verbe.
            > - 130 caractères maximum par partie d'une blague.
            > - Majuscule en début de phrase à moins quelle ne soit précédée de \`...\`
          `
        }
      ],
      color: 0x0067ad
    };
  }

  correctionsMessage(): APIEmbed {
    return {
      title: 'Bienvenue à toi ! 👋',
      description: stripIndents`
        Si tu le souhaites, tu peux proposer des corrections aux blagues de l'API Blagues API qui regroupe actuellement **${Jokes.count}** blagues françaises.

        > \`/correction\` dans le salon <#${commandsChannelId}>
      `,
      color: 0x0067ad
    };
  }
}
