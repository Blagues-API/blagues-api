import { CommandInteraction } from "discord.js";

export const interactionError: Function = (
  interaction: CommandInteraction,
  descriptionText: string,
  ephemeralChoice: boolean = true
) => {
  return interaction.reply({
    embeds: [
      {
        description: `❌ ${descriptionText}`,
        color: 0xff0000
      }
    ],
    ephemeral: ephemeralChoice
  });
};
