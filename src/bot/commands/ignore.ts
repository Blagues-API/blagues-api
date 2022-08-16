import {
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  InteractionReplyOptions,
  InteractionResponse,
  Message
} from 'discord.js';
import Command from '../lib/command';
import { Categories, CategoriesRefs, Category } from '../../typings';
import { commandsChannelId } from '../constants';
import { info, interactionError, interactionInfo, interactionValidate, interactionWaiter, isGodfather } from '../utils';
import prisma from '../../prisma';
import type { Godfather } from 'prisma/prisma-client';

type MinimalGodfatherPayload = Pick<Godfather, 'id' | 'ignored_categories'> & {
  ignored_categories: Category[];
};

export default class IgnoreCommand extends Command {
  private static ActionButtonsMapping: Record<string, string> = {
    discard: 'Annuler',
    save: 'Enregistrer'
  };

  public constructor() {
    super({
      name: 'ignore',
      description: 'Ouvre un menu permettant de choisir quelles catégories de blagues sont ignorées.',
      channels: [commandsChannelId]
    });
  }

  public async run(interaction: ChatInputCommandInteraction<'cached'>): Promise<void | InteractionResponse> {
    let godfather: MinimalGodfatherPayload;
    try {
      godfather = await this.checkIsGodfather(interaction);
    } catch (e: unknown) {
      if (e instanceof Error) {
        return interaction.reply(interactionInfo(e.message));
      }

      return;
    }

    const message = (await interaction.reply({
      ...this.generateMessageOptions(godfather.ignored_categories),
      ephemeral: true,
      fetchReply: true
    })) as unknown as Message<true>;

    let toggledCategories: Category[] = godfather.ignored_categories;

    // Ptet refactor la boucle et le interactionWaiter dans un util si jamais on a besoin de ré-implementer un menu dans le style
    while (true) {
      let buttonInteraction;
      try {
        buttonInteraction = await interactionWaiter(
          {
            component_type: ComponentType.Button,
            message,
            user: interaction.user
          },
          { reject_on_idle: true }
        );
      } catch (e: unknown) {
        break;
      }

      if (!buttonInteraction) {
        break;
      }

      if (Categories.includes(buttonInteraction.customId as Category)) {
        const toggledCategory = buttonInteraction.customId as Category;
        const isAlreadyIgnored = toggledCategories.includes(toggledCategory);

        toggledCategories = isAlreadyIgnored
          ? toggledCategories.filter((category) => category !== toggledCategory)
          : [...toggledCategories, toggledCategory];

        await Promise.all([
          interaction.editReply(this.generateMessageOptions(toggledCategories)),
          buttonInteraction.deferUpdate()
        ]);

        continue;
      }

      if (buttonInteraction.customId === 'discard') {
        await Promise.all([
          interaction.editReply(interactionError("Vos modifications n'ont pas été enregistrées.")),
          buttonInteraction.deferUpdate()
        ]);
        toggledCategories = godfather.ignored_categories;

        break;
      }

      if (buttonInteraction.customId === 'save') {
        await Promise.all([
          interaction.editReply(interactionValidate('Vos modifications ont bien été enregistrées.')),
          buttonInteraction.deferUpdate()
        ]);

        break;
      }
    }
    toggledCategories.sort();
    godfather.ignored_categories.sort();

    if (
      toggledCategories.length === godfather.ignored_categories.length &&
      toggledCategories.every((category, index) => category === godfather.ignored_categories[index])
    ) {
      // Categories are the same
      return;
    }

    await prisma.godfather.update({
      where: {
        id: godfather.id
      },
      data: {
        ignored_categories: toggledCategories
      }
    });
  }

  private generateMessageOptions(ignoredCategories: Category[]): InteractionReplyOptions {
    const embed = info('Choisissez quels catégories vous souhaitez ignorer / voir à nouveau');
    const buttons = Object.entries(CategoriesRefs).map(([category, name]) => {
      const isAlreadyIgnored = ignoredCategories.includes(category as Category);

      return {
        type: ComponentType.Button,
        custom_id: category,
        style: isAlreadyIgnored ? ButtonStyle.Secondary : ButtonStyle.Primary,
        label: isAlreadyIgnored ? `❌ ${name}` : `✅ ${name}`
      };
    });
    const buttonsRows = [buttons.slice(0, 3), buttons.slice(3)];

    return {
      embeds: [embed],
      components: [
        ...buttonsRows.map((row) => ({
          type: ComponentType.ActionRow,
          components: row
        })),
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              custom_id: 'discard',
              label: IgnoreCommand.ActionButtonsMapping.discard,
              style: ButtonStyle.Danger
            },
            {
              type: ComponentType.Button,
              custom_id: 'save',
              label: IgnoreCommand.ActionButtonsMapping.save,
              style: ButtonStyle.Success
            }
          ]
        }
      ]
    } as InteractionReplyOptions;
  }

  private async checkIsGodfather(interaction: ChatInputCommandInteraction<'cached'>): Promise<MinimalGodfatherPayload> {
    if (!isGodfather(interaction.member)) {
      throw new Error('Seul les parrains peuvent utiliser cette commande.');
    }

    const godfather = await prisma.godfather.findUnique({
      where: {
        user_id: interaction.user.id
      },
      select: {
        id: true,
        ignored_categories: true
      }
    });

    if (!godfather) {
      throw new Error('Veuillez approuver plusieurs blagues avant de faire la fine bouche ! 😜');
    }

    return godfather as MinimalGodfatherPayload;
  }
}
