import {
  ActionRowData,
  ButtonComponentData,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  MessageActionRowComponentData
} from 'discord.js';
import Command from '../lib/command';
import { Categories, CategoriesRefs, Category } from '../../typings';
import { commandsChannelId } from '../constants';
import { info, interactionInfo, isGodfather, waitForInteraction } from '../utils';
import prisma from '../../prisma';

export default class IgnoreCommand extends Command {
  public constructor() {
    super({
      name: 'ignore',
      description: 'Ouvre un menu permettant de choisir quelles catégories de blagues sont ignorées.',
      channels: [commandsChannelId]
    });
  }

  public async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!isGodfather(interaction.member)) {
      return interaction.reply(interactionInfo('Seul les parrains peuvent utiliser cette commande.'));
    }

    const godfather = await prisma.godfather.findUnique({
      select: {
        id: true,
        ignored_categories: true
      },
      where: {
        user_id: interaction.user.id
      }
    });

    if (!godfather) {
      return interaction.reply(
        interactionInfo('Veuillez approuver plusieurs blagues avant de faire la fine bouche ! 😜')
      );
    }

    const newCategories = await this.requestChanges(interaction, godfather.ignored_categories);
    if (!newCategories) return;

    await prisma.godfather.update({
      data: {
        ignored_categories: newCategories
      },
      where: {
        id: godfather.id
      }
    });
  }

  async requestChanges(
    commandInteraction: ChatInputCommandInteraction<'cached'>,
    ignoredCategories: string[]
  ): Promise<string[] | null> {
    const embed = info('Choisissez quels catégories vous souhaitez ignorer / voir à nouveau');
    const jokesTypesRows = Object.entries(CategoriesRefs).reduce<ActionRowData<MessageActionRowComponentData>[]>(
      (rows, [category, name]) => {
        const isAlreadyIgnored = ignoredCategories.includes(category);
        const element: ButtonComponentData = {
          type: ComponentType.Button,
          customId: category,
          style: isAlreadyIgnored ? ButtonStyle.Secondary : ButtonStyle.Primary,
          label: isAlreadyIgnored ? `❌ ${name}` : `✅ ${name}`
        };

        const lastRow = rows[rows.length - 1];
        if (lastRow.components.length < 5) {
          lastRow.components.push(element);
          // 4 because we need the last line for cancel/save
        } else if (rows.length < 4) {
          rows.push({ type: ComponentType.ActionRow, components: [element] });
        }

        return rows;
      },
      [{ type: ComponentType.ActionRow, components: [] }]
    );

    const question = await commandInteraction[commandInteraction.replied ? 'editReply' : 'reply']({
      embeds: [embed],
      components: [
        ...jokesTypesRows,
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              customId: 'cancel',
              label: 'Annuler',
              style: ButtonStyle.Danger
            },
            {
              type: ComponentType.Button,
              customId: 'save',
              label: 'Enregistrer',
              style: ButtonStyle.Success
            }
          ]
        }
      ],
      ephemeral: true,
      fetchReply: true
    });

    const buttonInteraction = await waitForInteraction({
      componentType: ComponentType.Button,
      message: question,
      user: commandInteraction.user
    });

    if (!buttonInteraction) {
      await commandInteraction.editReply(interactionInfo("La minute s'est écoulée."));
      return null;
    }

    switch (buttonInteraction.customId) {
      case 'cancel': {
        await commandInteraction.deleteReply();
        return null;
      }
      case 'save': {
        return ignoredCategories;
      }
      default: {
        if (!Categories.includes(buttonInteraction.customId as Category)) return null;

        const toggledCategory = buttonInteraction.customId as Category;
        const isAlreadyIgnored = ignoredCategories.includes(toggledCategory);

        ignoredCategories = isAlreadyIgnored
          ? ignoredCategories.filter((category) => category !== toggledCategory)
          : [...ignoredCategories, toggledCategory];

        return this.requestChanges(commandInteraction, ignoredCategories);
      }
    }
  }
}
