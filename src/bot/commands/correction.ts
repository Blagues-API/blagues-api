import { stripIndents } from 'common-tags'
import { ButtonInteraction, CommandInteraction, Interaction, Message, MessageActionRow, MessageButton, MessageSelectMenu, MessageSelectOptionData, SelectMenuInteraction } from 'discord.js'
import { jokeById, jokeByQuestion } from '../../controllers'
import { Category, Joke, JokeTypesDescriptions, JokeTypesRefs } from '../../typings'
import Command from '../lib/command'

enum IdType {
  MESSAGE_ID,
  JOKE_ID,
  MESSAGE_QUESTION
}

export default class CorrectionCommand extends Command {
  constructor(){
    super({
      name: 'correct',
      description: 'Proposer une modification de blague',
      options: [{
        type: 'STRING',
        name: 'identifiant',
        description: 'ID ou question de la blague ou ID du message',
        required: true
      }]
    })
  }
  async run(interaction: CommandInteraction){
    const raw_id = interaction.options.get('identifiant')?.value as string

    let joke: Joke | null = await this.getJoke(raw_id, interaction);
    if (!joke) {
      const question = await interaction.reply({
        embeds: [{
          title: 'Correction de blague',
          description: "Il faut tout d'abbord identifier la blague. Pour cela, il faut l'identifiant de la blague, l'identifiant du message la proposant ou la question de celle-ci."
        }],
        fetchReply: true
      }) as Message;
      joke = await this.requestJoke(interaction, question);
    }
    if(!joke) return;

    const newJoke = await this.requestChanges(interaction, joke);

    console.log(newJoke);

    return;
  }

  async requestJoke(interaction: CommandInteraction, question: Message): Promise<Joke | null> {
    const messages = await question.channel.awaitMessages({
      filter: (m: Message) => m.author.id === interaction.user.id,
      time: 10000,
      max: 1
    })
    const message = messages.first();
    if(!message) {
      await interaction.editReply({
        embeds: [
          question.embeds[0],
          {
            title: '💡 Commande annulée',
            color: 0xFFDA83
          }
        ]
      })
      return null;
    }

    const joke: Joke | null = await this.getJoke(message.content, interaction);
    if(message.deletable) await message.delete();
    if(!joke) {
      question.channel.send('pas bon fréro').then(m => setTimeout(() => m.deletable && m.delete(), 5000));
      return this.requestJoke(interaction, question);
    }
    return joke;
  }

  async requestChanges(interaction: CommandInteraction, joke: Joke, changes: boolean = false): Promise<Joke | null> {
    const embed = {
      title: `Quels${changes ? ' autres' : ''} changements voulez-vous faire ?`,
      description: stripIndents`
        > **Type:** ${joke.type}
        > **Question:** ${joke.joke}
        > **Réponse:** ${joke.answer}
      `
    }
    const question = await interaction[interaction.replied ? 'editReply' : 'reply']({
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
    }) as Message;

    const button: ButtonInteraction = await question.awaitMessageComponent({
      filter: (i: Interaction) => i.user.id === interaction.user.id,
    }) as ButtonInteraction;

    switch(button.customId) {
      case "type": {
        const typeMessage = await button.reply({
          content: 'Par quel type de blague voulez-vous changer le type actuel ?',
          components: [
            new MessageActionRow({
              components: [
                new MessageSelectMenu({
                  customId: 'type',
                  placeholder: 'Nouveau type de blague',
                  options: Object.entries(JokeTypesRefs).map(([key, name]) => ({
                    label: name,
                    value: key,
                    description: JokeTypesDescriptions[key as Category],
                  }) as MessageSelectOptionData),
                  maxValues: 1,
                  minValues: 1,
                }),
              ]
            })
          ],
          fetchReply: true
        }) as Message;

        const response: SelectMenuInteraction = await typeMessage.awaitMessageComponent({
          filter: (i: Interaction) => i.user.id === interaction.user.id,
          time: 30000,
        }) as SelectMenuInteraction;

        joke.type = response.values[0] as Category

        if(typeMessage.deletable) await button.deleteReply();

        return this.requestChanges(interaction, joke as Joke, true);
      }
      default: return joke;
    }
  }

 async getJoke(id: string, interaction: CommandInteraction): Promise<Joke | null> {
    const type: IdType = this.getIdType(id);
    switch (type) {
      case IdType.MESSAGE_ID: {
        // Récupérer le message et le contenu

        /*const message: Message = (interaction.client.channels.cache.get(suggestsChannel) as TextChannel)?.messages.cache.get(id) as Message
        const description: string = message.embeds[0].description as string*/

        return {
          id: Number(id),
          type: 'dark',
          joke: 'test',
          answer: 'test'
        };
      }
      case IdType.MESSAGE_QUESTION: {
        // Récupérer la blague à partir de la question
       return jokeByQuestion(id)
      }
      case IdType.JOKE_ID: {
        return jokeById(Number(id))
      }
    }
  }

  getIdType(id: string): IdType {
    if(isNaN(Number(id))) {
      return IdType.MESSAGE_QUESTION
    }
    if(id.length > 6) {
      return IdType.MESSAGE_ID
    }
    return IdType.JOKE_ID
  }



}
