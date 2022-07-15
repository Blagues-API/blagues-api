// npx tsc-watch --onSuccess "node dist/index.js
import { jokeById } from '../../controllers';
import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Message,
  MessageComponentInteraction,
  TextChannel
} from 'discord.js';
import { CategoriesRefsFull, ReportReasons, Joke, Reason } from '../../typings';
import { Colors, commandsChannelId, reportsChannelId } from '../constants';
import Command from '../lib/command';
import { compareTwoStrings } from 'string-similarity';
import { interactionInfo, interactionProblem, info, isEmbedable, JokeCorrectionPayload } from '../utils';
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
        `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
        `${doublon.joke.toLowerCase()} ${doublon.answer.toLowerCase()}`
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
    interaction: ChatInputCommandInteraction<'cached'>,
    joke: Joke
  ): Promise<JokeCorrectionPayload | null> {
    const bestDoublons: Joke[] = Jokes.list.filter((j) => j.id < 11);
    for (const b of Jokes.list) {
      const match = compareTwoStrings(
        `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
        `${b.joke.toLowerCase()} ${b.answer.toLowerCase()}`
      );
      for (const _b of bestDoublons) {
        const _match = compareTwoStrings(
          `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
          `${_b.joke.toLowerCase()} ${_b.answer.toLowerCase()}`
        );
        if (match > _match) {
          const index = bestDoublons.indexOf(_b);
          bestDoublons.splice(index, 1);
          bestDoublons.push(b);
          bestDoublons.sort((d1: Joke, d2: Joke) => {
            const match = compareTwoStrings(
            `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
            `${d1.joke.toLowerCase()} ${d1.answer.toLowerCase()}`
            );
            const _match = compareTwoStrings(
            `${joke.joke.toLowerCase()} ${joke.answer.toLowerCase()}`,
            `${d2.joke.toLowerCase()} ${d2.answer.toLowerCase()}`
            );
            return (match > _match) ? 1 : -1
            }
          )
        }
      }
    }
    const question = await interaction.reply({
      embeds: [
        {
          title: `Quel est le doublon de la blague suivante ? (ID : \`${joke.id}\`)`,
          description: `
          > **Type**: ${CategoriesRefsFull[joke.type]}
          > **Blague**: ${joke.joke}
          > **Réponse**: ${joke.answer}

          Répondez par \`cancel\` pour annuler la commande.
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
              // TODO : Il faudrait faire quelque chose avec bestDoublons, mais j'y arrive pas... Au secours
              options: Object.entries({texte_hey: 'Hey !'}).map(([key, name]) => ({
                label: name,
                value: key,
                description: 'JokeTypesDescriptions[key as Category]'
              })),
              maxValues: 1,
              minValues: 1
            }
          ]
        }
      ],
      fetchReply: true
    });

    return new Promise((resolve) => {
      const collector = question.channel.createMessageCollector({
        filter: (m: Message) => m.author.id === interaction.user.id,
        idle: 60_000
      });
      collector.on('collect', async (msg: Message) => {
        if (msg.deletable) setInterval(() => msg.delete().catch(() => null), 5000);
        // TODO : faire en sorte que la sélection du doublon renvoie à la modification du message avec un EMBED "Est-ce ce doublon ?" et 2 boutons oui / non. Oui => Message de demande d'envoi du report, Non => Retour au message sélecteur
      });
      collector.once('end', async (_collected, reason: string) => {
        if (reason === 'idle') {
          await interaction.editReply({
            embeds: [info('Les 60 secondes se sont écoulées.')]
          });
          return resolve(null);
        }
      });
    });
  }
}
