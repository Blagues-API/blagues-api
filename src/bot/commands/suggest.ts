import { stripIndents } from 'common-tags';
import { ColorResolvable, CommandInteraction, Guild, MessageActionRow, MessageButton, MessageEmbedOptions, TextChannel, User } from 'discord.js';
import { findBestMatch } from 'string-similarity';
import jokes from '../../../blagues.json';
import { suggestsChannel } from '../constants';
import { interactionError } from '../utils';
export default async (interaction: CommandInteraction) => {

  if (
    (interaction.options.get('joke')!.value as string).length > 130 ||
    (interaction.options.get('response')!.value as string).length > 130
  )
    return interactionError(
      interaction,
      "Chaque partie d'une blague ne peut pas excéder 130 caractères !"
    );
    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${interaction.options.get('joke')!.value} ${interaction.options.get('response')!.value}`,
      jokes.map((e) => `${e.joke} ${e.answer}`)
    );

      var color: ColorResolvable = 'BLUE'
      if(bestMatch.rating > 0.6) color = 'YELLOW'
      if(bestMatch.rating > 0.75) color = 'RED'

      let description = stripIndents`
      > **Type**: ${interaction.options.get('type')!.value}
      > **Blague**: ${interaction.options.get('joke')!.value}
      > **Réponse**: ${interaction.options.get('response')!.value}
      `
      if(color != 'BLUE'){
        description = stripIndents`**Votre blague**
        ${description}
        **[Blague similaire](https://github.com/Blagues-API/blagues-api/blob/master/blagues.json#L${6 * jokes[bestMatchIndex].id - 4}-L${6 *  jokes[bestMatchIndex].id + 1})**
        >>> **Type**: ${jokes[bestMatchIndex].type}
        **Blague**: ${jokes[bestMatchIndex].joke}
        **Réponse**: ${jokes[bestMatchIndex].answer}
        `
      }

    const embed: MessageEmbedOptions = {
      color: color,
      author: {
        icon_url: (interaction.member!.user as User).displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: (interaction.member!.user as User).tag,
      },
      description: description,
      footer: {
        text: (interaction.guild as Guild).name,
        icon_url: (interaction.guild as Guild).iconURL({
          format: 'png',
          size: 32,
          dynamic: true
        }) ?? undefined
      },
      timestamp: Date.now(),
    }

  const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
        .setCustomId('true')
        .setLabel('Envoyer')
        .setStyle('SUCCESS')
      ).addComponents(
        new MessageButton()
        .setCustomId('false')
        .setLabel('Ne pas envoyer')
        .setStyle('DANGER')
      )
   await interaction.reply({content: `${color == 'RED' ? `Cette blague fait déjà partie de l\'api sous l\'id de **${jokes[bestMatchIndex].id}**.`  : 'Merci de nous avoir suggeré cette blague. Mais avant de l\'envoyer, nous vous invitons à verifier si aucune faute n\'est présente.'}${color == 'YELLOW' ? ' Une blague similaire est répertorier dans l\'api et donc la blague doit impérativement ne pas être envoyée si c\'est le cas.':''}`, embeds: [embed], components: color == 'RED' ? [] : [row], ephemeral: true })

   const filter = (i: { customId: string; user: { id: string; }; }) => i.user.id === interaction.user.id;

   const collector = interaction.channel!.createMessageComponentCollector({ filter, time: 30000 });

   collector.on('collect', async i => {
     if (i.customId === 'true') {
      const channel: TextChannel = interaction.guild!.channels.cache.get(
        suggestsChannel
      ) as TextChannel;

      channel.send({embeds: [embed]});
       await i.update({ content: 'La blague à été envoyée', components: [], embeds: [] });
     }else if(i.customId === 'false'){
      await i.update({ content: 'La blague n\'a pas été envoyé', components: [], embeds: [embed]});
     }
   });
};

