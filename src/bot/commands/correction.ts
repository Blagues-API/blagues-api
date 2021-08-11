import { stripIndents } from 'common-tags';
import {
  ButtonInteraction,
  ColorResolvable,
  CommandInteraction,
  Interaction,
  Message,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  MessageSelectOptionData,
  SelectMenuInteraction,
  TextChannel
} from 'discord.js';
import { jokeById, jokeByQuestion } from '../../controllers';
import {
  Category,
  Joke,
  JokeNotPublished,
  JokeTypesDescriptions,
  JokeTypesRefs
} from '../../typings';
import { suggestsChannel } from '../constants';
import Command from '../lib/command';

enum IdType {
  MESSAGE_ID,
  JOKE_ID,
  MESSAGE_QUESTION
}

export default class CorrectionCommand extends Command {
  constructor() {
    super({
      name: 'correct',
      description: 'Proposer une modification de blague',
      options: [
        {
          type: 'STRING',
          name: 'identifiant',
          description: 'ID ou question de la blague ou ID du message',
          required: true
        }
      ]
    });
  }
  async run(interaction: CommandInteraction): Promise<void> {
    const raw_id = interaction.options.get('identifiant')?.value as string;

    let joke: Joke | JokeNotPublished | null = await this.getJoke(
      raw_id,
      interaction
    );
    if (!joke) {
      const question = (await interaction.reply({
        embeds: [
          {
            title: 'Correction de blague',
            description:
              "Il faut tout d'abbord identifier la blague. Pour cela, il faut l'identifiant de la blague, l'identifiant du message la proposant ou la question de celle-ci."
          }
        ],
        fetchReply: true
      })) as Message;
      joke = await this.requestJoke(interaction, question);
    }
    if (!joke) return;

    const newJoke: Joke | JokeNotPublished | null = await this.requestChanges(
      interaction,
      joke
    );

    await interaction.editReply({
      embeds: [
        {
          title: 'Requête de changement envoyée',
          description: stripIndents`
        > **Type:** ${joke.type}
        > **Question:** ${joke.joke}
        > **Réponse:** ${joke.answer}
      `,
          color: 'GREEN' as ColorResolvable
        }
      ],
      components: []
    });

    if (newJoke) await this.EditJoke(interaction, newJoke);
  }

  async requestJoke(
    interaction: CommandInteraction,
    question: Message
  ): Promise<Joke | JokeNotPublished | null> {
    const messages = await question.channel.awaitMessages({
      filter: (m: Message) => m.author.id === interaction.user.id,
      time: 10000,
      max: 1
    });
    const message = messages.first();
    if (!message) {
      await interaction.editReply({
        embeds: [
          question.embeds[0],
          {
            title: '💡 Commande annulée',
            color: 0xffda83
          }
        ]
      });
      return null;
    }

    const joke: Joke | JokeNotPublished | null = await this.getJoke(
      message.content,
      interaction
    );
    if (message.deletable) await message.delete();
    if (!joke) {
      question.channel
        .send('pas bon fréro')
        .then((m) => setTimeout(() => m.deletable && m.delete(), 5000));
      return this.requestJoke(interaction, question);
    }
    return joke;
  }

  async requestChanges(
    interaction: CommandInteraction,
    joke: Joke | JokeNotPublished,
    changes = false
  ): Promise<Joke | JokeNotPublished | null> {
    const embed = {
      title: `Quels${changes ? ' autres' : ''} changements voulez-vous faire ?`,
      description: stripIndents`
        > **Type:** ${joke.type}
        > **Question:** ${joke.joke}
        > **Réponse:** ${joke.answer}
      `
    };
    const question = (await interaction[
      interaction.replied ? 'editReply' : 'reply'
    ]({
      embeds: [embed],
      components: [
        new MessageActionRow({
          components: [
            new MessageButton({
              label: 'Type',
              customId: 'type',
              style: 'PRIMARY'
            }),
            new MessageButton({
              label: 'Question',
              customId: 'question',
              style: 'PRIMARY'
            }),
            new MessageButton({
              label: 'Réponse',
              customId: 'answer',
              style: 'PRIMARY'
            }),
            new MessageButton({
              label: 'Valider',
              customId: 'valid',
              style: 'SUCCESS'
            })
          ]
        })
      ],
      fetchReply: true
    })) as Message;

    const button: ButtonInteraction = (await question.awaitMessageComponent({
      filter: (i: Interaction) => i.user.id === interaction.user.id
    })) as ButtonInteraction;

    switch (button.customId) {
      case 'type': {
        const typeMessage = (await button.reply({
          content:
            'Par quel type de blague voulez-vous changer le type actuel ?',
          components: [
            new MessageActionRow({
              components: [
                new MessageSelectMenu({
                  customId: 'type',
                  placeholder: 'Nouveau type de blague',
                  options: Object.entries(JokeTypesRefs).map(
                    ([key, name]) =>
                      ({
                        label: name,
                        value: key,
                        description: JokeTypesDescriptions[key as Category]
                      } as MessageSelectOptionData)
                  ),
                  maxValues: 1,
                  minValues: 1
                })
              ]
            })
          ],
          fetchReply: true
        })) as Message;

        const response: SelectMenuInteraction = (await typeMessage
          .awaitMessageComponent({
            filter: (i: Interaction) => i.user.id === interaction.user.id,
            time: 30000
          })
          .catch(() => {
            typeMessage.edit({
              content:
                'Par quel type de blague voulez-vous changer le type actuel ?',
              embeds: [
                {
                  title: '💡 Commande annulée',
                  color: 0xffda83
                }
              ],
              components: []
            });
          })) as SelectMenuInteraction;

        if (!response) return null;
        joke.type = response.values[0] as Category;

        if (typeMessage.deletable) await button.deleteReply();

        return this.requestChanges(interaction, joke, true);
      }

      case 'question': {
        const response = await this.requestChangesResponse(
          button,
          interaction,
          joke as Joke,
          'question'
        );
        if (response) return this.requestChanges(interaction, response, true);
        return null;
      }
      case 'answer': {
        const response = await this.requestChangesResponse(
          button,
          interaction,
          joke as Joke,
          'réponse'
        );
        if (response) return this.requestChanges(interaction, response, true);
        return null;
      }
      default:
        return joke;
    }
  }

  async getJoke(
    id: string,
    interaction: CommandInteraction
  ): Promise<Joke | JokeNotPublished | null> {
    const type: IdType = this.getIdType(id);
    switch (type) {
      case IdType.MESSAGE_ID: {
        const message: Message = (await (
          interaction.client.channels.cache.get(suggestsChannel) as TextChannel
        )?.messages.fetch(id)) as Message;
        if (!message) return null;
        const description: string = message.embeds[0].description as string;
        const regex = /:\s(.+)/g;
        const array = [];
        let m;
        while ((m = regex.exec(description)) !== null) {
          array.push(m[1]);
        }
        return {
          id: message.id,
          type: array[0] as Category,
          joke: array[1],
          answer: array[2]
        } as JokeNotPublished;
      }
      case IdType.MESSAGE_QUESTION: {
        return jokeByQuestion(id) as Joke;
      }
      case IdType.JOKE_ID: {
        return jokeById(Number(id)) as Joke;
      }
    }
  }

  getIdType(id: string): IdType {
    if (isNaN(Number(id))) {
      return IdType.MESSAGE_QUESTION;
    }
    if (id.length > 6) {
      return IdType.MESSAGE_ID;
    }
    return IdType.JOKE_ID;
  }

  async requestChangesResponse(
    button: ButtonInteraction,
    interaction: CommandInteraction,
    joke: Joke,
    textReplyContent: string
  ): Promise<Joke | JokeNotPublished | null> {
    const questionMessage = (await button.reply({
      content: `Par quelle ${textReplyContent} voulez-vous changer la ${textReplyContent} actuelle ?`,
      fetchReply: true
    })) as Message;
    const messages = await interaction.channel?.awaitMessages({
      filter: (m: Message) => m.author.id === interaction.user.id,
      time: 30000,
      max: 1
    });
    const message = messages?.first();
    if (!message) {
      questionMessage.edit({
        content: questionMessage.content,
        embeds: [
          {
            title: '💡 Commande annulée',
            color: 0xffda83
          }
        ]
      });
      return null;
    }
    joke[textReplyContent == 'question' ? 'joke' : 'answer'] = message.content;
    if (questionMessage.deletable) await button.deleteReply();
    if (message.deletable) await message.delete();
    return joke;
  }

  async EditJoke(
    interaction: CommandInteraction,
    newJoke: Joke | JokeNotPublished
  ): Promise<void> {
    if (newJoke.id > 6) {
      const channel: TextChannel = interaction.client.channels.cache.get(
        suggestsChannel
      ) as TextChannel;
      const message: Message = (await channel.messages.fetch(
        String(newJoke.id)
      )) as Message;
      const embed = message.embeds[0];
      embed.fields.push({
        name: interaction.user.username,
        value: stripIndents`
          \`\`\`
          **Type:** ${newJoke.type}
          **Question:** ${newJoke.joke}
          **Réponse:** ${newJoke.answer}
          \`\`\`
        `,
        inline: false
      });

      await message.edit({ embeds: [embed] });
    }
  }
}
