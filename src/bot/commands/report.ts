// npx tsc-watch --onSuccess "node dist/index.js
import { jokeById, jokeByQuestion } from '../../controllers';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Interaction,
  Message,
  MessageComponentInteraction,
  TextChannel
} from 'discord.js';
import { CategoriesRefsFull, ReportReasons, Joke, Reason } from '../../typings';
import { Colors, commandsChannelId, reportsChannelId } from '../constants';
import Command from '../lib/command';
import { compareTwoStrings, findBestMatch } from 'string-similarity';
import { interactionInfo, interactionProblem, info, isEmbedable, JokeCorrectionPayload, messageInfo } from '../utils';
import Jokes from '../../jokes';
export default class ReportCommand extends Command {
  constructor() {
    super({
      name: 'report',
      description: 'Signaler une blague',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'id',
          description: 'ID de la blague',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'raison',
          description: 'Raison du signalement de la blague',
          required: true,
          choices: Object.entries(ReportReasons).map(([key, name]) => ({
            name,
            value: key
          }))
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'informations',
          description: 'Informations supplémentaires',
          required: false
        }
      ]
    });
  }
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.channelId !== commandsChannelId) {
      return interaction.reply(
        interactionInfo(`Préférez utiliser les commandes dans le salon <#${commandsChannelId}>.`)
      );
    }

    // TODO : ajouter un choix pour signaler une blague refusée injustement + dans approve, mettre le lien de la blague dans le "Votre approbation a bien été retirée."

    const jokeId = interaction.options.getInteger('id', true);
    const joke = jokeById(jokeId);
    if (!joke) {
      return interaction.reply(interactionInfo(`L'identifiant \`${jokeId}\` ne correspond à aucune blague connue.`));
    }

    const raison = interaction.options.getString('raison', true);

    const embed = {
      author: {
        name: interaction.user.tag,
        icon_url: interaction.user.displayAvatarURL({
          size: 32
        })
      },
      fields: [
        {
          name: 'Blague signalée',
          value: `
          > **Type**: ${CategoriesRefsFull[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}
          `,
          inline: true
        }
      ],
      color: Colors.PROPOSED
    };

    if (raison === 'doublon') {
      const doublon = await this.getDoublon(interaction, joke);

      if (!doublon) return;

      const match = compareTwoStrings(
        `${joke.joke} ${joke.answer}`,
        `${doublon.joke} ${doublon.answer}`
      );
      if (match < 0.8) {
        return interaction.reply(
          interactionInfo(`Les blagues \`${jokeId}\` et \`${doublon.id}\` ne sont pas assez ressemblantes.`)
        );
      }

      const confirmation = await this.waitForSendConfirmation(interaction, embed, match);
      if (!confirmation) return;

      if (confirmation.customId === 'cancel') {
        return confirmation.update({
          content: "La blague n'a pas été envoyée.",
          components: [],
          embeds: [embed]
        });
      }

      const reportsChannel = interaction.guild!.channels.cache.get(reportsChannelId) as TextChannel;
      if (!isEmbedable(reportsChannel)) {
        return interaction.reply(
          interactionProblem(`Je n'ai pas la permission d'envoyer la blague dans le salon ${reportsChannel}.`, false)
        );
      }

      if (confirmation.customId !== 'send') {
        return interaction.reply(
          interactionProblem(
            "Il y a eu une erreur lors de l'exécution de la commande, veillez contacter le développeur !",
            true
          )
        );
      }

      embed.fields.push({
        name: 'Doublon',
        value: `
        > **Type**: ${CategoriesRefsFull[doublon.type]}
        > **Blague**: ${doublon.joke}
        > **Réponse**: ${doublon.answer}
        `,
        inline: false
      });
      embed.fields.push({
        name: 'Ressemblance',
        value: `${match * 100} %`,
        inline: false
      });
    } else {
      embed.fields.push({
        name: 'Raison',
        value: ReportReasons[raison as Reason],
        inline: false
      });
    }

    return interaction.reply({
      embeds: [embed]
    });
  }

  async waitForSendConfirmation(
    interaction: ChatInputCommandInteraction,
    embed: APIEmbed,
    match: number
  ): Promise<ButtonInteraction | null> {
    const message = await interaction.reply({
      content: `${match > 0.9 ? 'Voulez-vous' : 'Êtes-vous sûr de vouloir'} envoyer le signalement suivant ?`,
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Envoyer',
              customId: 'send',
              style: ButtonStyle.Success
            },
            {
              type: ComponentType.Button,
              label: 'Annuler',
              customId: 'cancel',
              style: ButtonStyle.Danger
            }
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    });

    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        max: 1,
        componentType: ComponentType.Button,
        filter: (i: MessageComponentInteraction) => i.user.id === interaction.user.id,
        time: 60_000
      });
      collector.once('end', async (interactions, reason) => {
        const buttonInteraction = interactions.first();
        if (!buttonInteraction) {
          if (reason !== 'time') resolve(null);
          if (message.deletable) await message.delete();
          await interaction.reply(interactionInfo('Les 60 secondes se sont ecoulées.'));
          return resolve(null);
        }

        return resolve(buttonInteraction);
      });
    });
  }

  async getDoublon(
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    joke: Joke
  ): Promise<JokeCorrectionPayload | null> {
    const { ratings } = findBestMatch(
      `${joke.joke}|${joke.answer}`,
      Jokes.list.map((entry) => `${entry.joke}|${entry.answer}`)
    );
    ratings.sort((a, b) => a.rating - b.rating).reverse().splice(11, ratings.length - 11);
    ratings.shift();
    const question = await commandInteraction[commandInteraction.replied ? 'editReply' : 'reply']({
      embeds: [
        {
          title: `Quel est le doublon de la blague suivante ? (ID : \`${joke.id}\`)`,
          description: `
          > **Type**: ${CategoriesRefsFull[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}
          `,
          color: Colors.PROPOSED
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.SelectMenu,
              customId: 'doublons',
              placeholder: 'Choisissez un doublon...',
              options: ratings.map((value) => ({
                label: `Ressemblance à ${(value.rating * 100).toFixed(0)} %`,
                value: jokeByQuestion(value.target.split('|')[0])!.id.toString(),
                description: value.target.split('|')[0].slice(0, 100)
              })),
              maxValues: 1,
              minValues: 1
            }
          ]
        }
      ],
      fetchReply: true
    });

    const response = await question
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === commandInteraction.user.id,
        componentType: ComponentType.SelectMenu,
        time: 60_000
      })
      .catch(() => null);

    if (!response) {
      question.edit(messageInfo('Les 60 secondes se sont écoulées.'));
      return null;
    }

    const blague = jokeById(+response.values[0])!;

    await response.deferUpdate();
    const isRightDoublon = await this.isRightDoublon(commandInteraction, question, blague);

    if (isRightDoublon) {
      question.edit({
        embeds: [question.embeds[0]],

      })
    }
    
    

    // À modifier

    return new Promise((resolve) => {
      const collector = question.channel.createMessageCollector({
        filter: (m: Message) => m.author.id === commandInteraction.user.id,
        idle: 60_000
      });
      collector.on('collect', async (msg: Message) => {
        if (msg.deletable) setInterval(() => msg.delete().catch(() => null), 5000);
        // TODO : faire en sorte que la sélection du doublon renvoie à la modification du message avec un EMBED "Est-ce ce doublon ?" et 2 boutons oui / non. Oui => Message de demande d'envoi du report, Non => Retour au message sélecteur
      });
      collector.once('end', async (_collected, reason: string) => {
        if (reason === 'idle') {
          await commandInteraction.editReply({
            embeds: [info('Les 60 secondes se sont écoulées.')]
          });
          return resolve(null);
        }
      });
    });
  }

  async isRightDoublon(interaction: ChatInputCommandInteraction<'cached'>, question: Message<boolean>, blague: Joke) {
    await question.edit({
      embeds: [
        question.embeds[0],
        {
          title: 'Est-ce bien le doublon que vous avez choisi ?',
          description: `
          > **Type**: ${CategoriesRefsFull[blague.type]}
          > **Blague**: ${blague.joke}
          > **Réponse**: ${blague.answer}
          `,
          color: Colors.PRIMARY
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              label: 'Oui',
              customId: 'oui',
              type: ComponentType.Button,
              style: ButtonStyle.Success
            },
            {
              label: 'Non',
              customId: 'non',
              type: ComponentType.Button,
              style: ButtonStyle.Danger
            }
          ]
        }
      ]
    });

    const response = await question
      .awaitMessageComponent({
        filter: (i: Interaction) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 60_000
      })
      .catch(() => null);

    if (!response) {
      question.edit(messageInfo('Les 60 secondes se sont écoulées.'));
      return null;
    }
      
    switch (response.customId) {
      case 'oui': {
        return true;
      }
      case 'non': {
        return this.getDoublon(interaction, blague);
      }
    }
  }
}
