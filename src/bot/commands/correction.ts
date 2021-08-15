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
import { correctionChannel, suggestsChannel } from '../constants';
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
    joke = await this.requestChanges(interaction, joke);
    await interaction.editReply({
      embeds: [
        {
          title: 'Requête de changement envoyée',
          description: stripIndents`
        > **Type:** ${joke!.type}
        > **Question:** ${joke!.joke}
        > **Réponse:** ${joke!.answer}
      `,
          color: 'GREEN' as ColorResolvable
        }
      ],
      components: []
    });

    if (joke) await this.editJoke(interaction, joke);
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
        const channel: TextChannel = interaction.client.channels.cache.get(
          suggestsChannel
        ) as TextChannel;
        const message: Message = (await channel.messages.fetch(id)) as Message;
        if (!message) return null;
        const description: string = message.embeds[0].description as string;
        const elements = [...description.matchAll(/:\s(.+)/g)].map(
          ([, value]) => value
        );
        return {
          message_id: message.id,
          // TODO: Ajouter un resolver, la valeur est pas forcément un type.
          type: elements[0] as Category,
          joke: elements[1],
          answer: elements[2]
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
    joke[textReplyContent === 'question' ? 'joke' : 'answer'] = message.content;
    if (questionMessage.deletable) await button.deleteReply();
    if (message.deletable) await message.delete();
    return joke;
  }

  async editJoke(
    interaction: CommandInteraction,
    joke: Joke | JokeNotPublished
  ): Promise<void> {
    if ('message_id' in joke) {
      const channel: TextChannel = interaction.client.channels.cache.get(
        suggestsChannel
      ) as TextChannel;
      const message: Message = (await channel.messages.fetch(
        joke.message_id
      )) as Message;

      const correction = stripIndents`
        \`\`\`
        **Type:** ${joke.type}
        **Question:** ${joke.joke}
        **Réponse:** ${joke.answer}
        \`\`\`
      `;

      if (message.embeds[0].fields.length > 0) {
        message.embeds[0].fields.forEach(async (field) => {
          if (field.value === correction) {
            await interaction.editReply({
              content: 'Cette correction à déjà été proposée',
              embeds: []
            });
            return;
          }
        });
      }
      const newJoke = (await this.getJoke(
        joke.message_id,
        interaction
      )) as JokeNotPublished;
      if (newJoke.joke === joke.joke) {
        await interaction.editReply({
          content: "Aucune élément n'a été modifié",
          embeds: []
        });
        return;
      }

      const embed = message.embeds[0];
      embed.fields.push({
        name: interaction.user.username,
        value: correction,
        inline: false
      });

      await message.edit({ embeds: [embed] });
    } else {
      const initJoke = jokeById(joke.id);
      // TODO: Que se passe-t-il si la blague a été supprimé de l'api ?
      console.log(initJoke);
      console.log(joke);
      // TODO: Va faloir faire une fonction de comparaison de contenu.
      // On peut pas comparer deux instances comme ça.
      if ((jokeById(joke.id) as Joke) === (joke as Joke)) {
        await interaction.editReply({
          content: "Aucune élement n'a été modifié",
          embeds: []
        });
        return;
      }
      const channel: TextChannel = interaction.client.channels.cache.get(
        correctionChannel
      ) as TextChannel;
      channel.send({
        embeds: [
          {
            title: interaction.user.username,
            description: stripIndents`
            **[Blague initiale](https://github.com/Blagues-API/blagues-api/blob/master/blagues.json#L${
              6 * (joke.id as number) - 4
            }-L${6 * (joke.id as number) + 1})**
            > **Type**: ${initJoke!.type}
            > **Blague**: ${initJoke!.joke}
            > **Réponse**: ${initJoke!.answer}

            **Blague corrigé:**
            > **Type**: ${joke.type}
            > **Blague**: ${joke.joke}
            > **Réponse**: ${joke.answer}
            `
          }
        ]
      });
    }
  }
}
