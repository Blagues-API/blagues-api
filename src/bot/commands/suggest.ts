import { stripIndents } from 'common-tags';
import { CommandInteraction, Guild, MessageActionRow, MessageButton, TextChannel, User } from 'discord.js';
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

    const embed =   {
      author: {
        icon_url: (interaction.member!.user as User).displayAvatarURL({
          format: 'png',
          size: 32,
          dynamic: true
        }),
        name: (interaction.member!.user as User).tag,
      },
      description: stripIndents`
      >>> **Type**: ${interaction.options.get('type')!.value}
      **Blague**: ${interaction.options.get('joke')!.value}
      **Réponse**: ${interaction.options.get('response')!.value}
      `,
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
   await interaction.reply({content: 'Merci de nous avoir suggeré cette blague. Mais avant de l\'envoyer, nous vous invitons à verifier si aucune faute n\'est présente.', embeds: [embed], components: [row], ephemeral: true })

   const filter = (i: { customId: string; user: { id: string; }; }) => i.user.id === interaction.user.id;

   const collector = interaction.channel!.createMessageComponentCollector({ filter, time: 15000 });

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

