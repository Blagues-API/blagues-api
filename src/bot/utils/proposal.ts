import { APIEmbed, Message, MessageContextMenuCommandInteraction } from 'discord.js';
import { Proposals } from '../../typings';
import { renderGodfatherLine } from '../modules/godfathers';
import { Colors, dataSplitRegex } from '../constants';
import { interactionProblem } from './embeds';
import { ProposalType } from '@prisma/client';

export async function updateProposalEmbed(
  interaction: MessageContextMenuCommandInteraction<'cached'>,
  proposal: Proposals,
  embed: APIEmbed
) {
  const godfathers = await renderGodfatherLine(interaction, proposal);
  const field = embed.fields?.[embed.fields.length - 1];
  if (field) {
    const { base, correction } = field.value.match(dataSplitRegex)!.groups!;
    field.value = [base, correction, godfathers].filter(Boolean).join('\n\n');
  } else {
    const { base, correction } = embed.description!.match(dataSplitRegex)!.groups!;
    embed.description = [base, correction, godfathers].filter(Boolean).join('\n\n');
  }

  return embed;
}

export async function checkProposalStatus<T extends Proposals>(
  interaction: MessageContextMenuCommandInteraction<'cached'>,
  proposal: T,
  message: Message
) {
  const embed = message.embeds[0].toJSON();
  const proposal_type = proposal.type === ProposalType.SUGGESTION ? 'Suggestion' : 'Correction';
  if (proposal.merged) {
    if (!embed.footer) {
      embed.color = Colors.ACCEPTED;
      embed.footer = {
        text: `${proposal_type} déjà traitée`
      };

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = field.value.match(dataSplitRegex)!.groups!.base;
      } else {
        embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
      }

      await message.edit({ embeds: [embed] });
    }

    await interaction.reply(interactionProblem(`${proposal_type} a déjà été ajoutée.`));
    return false;
  }

  if (proposal.refused) {
    if (!embed.footer) {
      embed.color = Colors.REFUSED;
      embed.footer = { text: `${proposal_type} refusée` };

      const field = embed.fields?.[embed.fields.length - 1];
      if (field) {
        field.value = field.value.match(dataSplitRegex)!.groups!.base;
      } else {
        embed.description = embed.description!.match(dataSplitRegex)!.groups!.base;
      }

      await message.edit({ embeds: [embed] });
    }

    await interaction.reply(interactionProblem(`${proposal_type} a déjà été refusée}.`));
    return false;
  }

  return true;
}
