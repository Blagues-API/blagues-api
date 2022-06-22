import { stripIndents } from 'common-tags';
import {
  ActivityType,
  AnyInteraction,
  APIEmbed,
  Client,
  GuildTextBasedChannel,
  IntentsBitField,
  InteractionType,
  Message,
  PartialMessage,
  Partials,
  Snowflake,
  TextChannel
} from 'discord.js';
import Jokes from '../jokes';
import prisma from '../prisma';
import { commandsChannelId, correctionsChannelId, suggestionsChannelId } from './constants';
import Dispatcher from './lib/dispatcher';
import Reminders from './modules/reminders';
import Stickys from './modules/stickys';
export default class Bot extends Client {
  public dispatcher: Dispatcher;
  public stickys: Stickys;
  public reminders: Reminders;

  constructor() {
    super({
      partials: [Partials.Reaction],
      intents:
        IntentsBitField.Flags.Guilds |
        IntentsBitField.Flags.GuildMembers |
        IntentsBitField.Flags.GuildMessages |
        IntentsBitField.Flags.MessageContent
    });

    this.dispatcher = new Dispatcher(this);
    this.stickys = new Stickys(this);
    this.reminders = new Reminders(this);

    this.once('ready', this.onReady.bind(this));
  }

  get available(): boolean {
    return !!this.readyAt;
  }

  async onReady(): Promise<void> {
    console.log(`${this.user!.tag} connecté !`);

    await this.dispatcher.register();

    this.registerEvents();

    this.refreshStatus();
  }

  async onInteractionCreate(interaction: AnyInteraction): Promise<void> {
    if (interaction.type === InteractionType.ApplicationCommand) {
      return this.dispatcher.execute(interaction);
    }
  }

  async onMessageDelete(message: Message | PartialMessage): Promise<void> {
    if (!message.inGuild()) return;
    if (message.author && message.author.id !== this.user!.id) return;
    if (![correctionsChannelId, suggestionsChannelId].includes(message.channelId)) return;
    if (!message.embeds[0]?.author) return;

    const proposal = await prisma.proposal.findUnique({
      where: { message_id: message.id },
      include: {
        corrections: suggestionsChannelId === message.channelId
      }
    });

    if (!proposal) return;

    await prisma.proposal.delete({
      where: {
        id: proposal.id
      }
    });

    if (proposal.corrections?.length) {
      const correctionsChannel = message.guild.channels.resolve(correctionsChannelId) as GuildTextBasedChannel;
      for (const correction of proposal.corrections) {
        try {
          const fetchedMessage = await correctionsChannel.messages.fetch(correction.message_id!);
          if (fetchedMessage.deletable) await fetchedMessage.delete();
        } catch {
          continue;
        }
      }
    }
  }

  async onMessageCreate(message: Message | PartialMessage): Promise<void> {
    if (message.channelId != suggestionsChannelId && message.channelId != correctionsChannelId) return;
    if (process.env.bot_stickies === 'false') return;

    if (message.channelId === suggestionsChannelId) {
      this.sticky(suggestionsChannelId, this.suggestsMessage());
    } else {
      this.sticky(correctionsChannelId, this.correctionsMessage());
    }
  }

  registerEvents(): void {
    this.on('interactionCreate', this.onInteractionCreate.bind(this));
    this.on('messageDelete', this.onMessageDelete.bind(this));
    this.on('messageCreate', this.onMessageCreate.bind(this));
  }

  refreshStatus() {
    this.user!.setActivity(`les ${Jokes.count} blagues`, {
      type: ActivityType.Watching
    });
  }

  async start(): Promise<void> {
    if (process.env.bot_service !== 'true') {
      return console.log('Bot service désactivé');
    }
    if (!process.env.BOT_TOKEN) {
      return console.log("Bot non lancé car aucun token n'a été défini");
    }
    await this.login(process.env.BOT_TOKEN);
  }

  // Needed functions for stickys messages running
  suggestsMessage(): APIEmbed {
    return {
      title: 'Bienvenue à toi ! 👋',
      description: stripIndents`
        Si tu le souhaites, tu peux proposer tes blagues afin qu'elles soient ajoutées à l'API Blagues-API, elle regroupe actuellement **${Jokes.count}** blagues françaises.
        Elles sont toutes issues de ce salon proposées par la communauté.

        > \`/suggestion\` dans le salon <#${commandsChannelId}>
      `,
      fields: [
        {
          name: 'Règles:',
          value: stripIndents`
            > - Espace avant les caractères: \`?\` et \`!\`.
            > - Ponctuation de fin de phrase si elle contient un verbe.
            > - 130 caractères maximum par partie d'une blague.
            > - Majuscule en début de phrase à moins quelle ne soit précédée de \`...\`
          `
        }
      ],
      color: 0x0067ad
    };
  }

  correctionsMessage(): APIEmbed {
    return {
      title: 'Bienvenue à toi ! 👋',
      description: stripIndents`
        Si tu le souhaites, tu peux proposer des corrections aux blagues de l'API Blagues API qui regroupe actuellement **${Jokes.count}** blagues françaises.

        > \`/correction\` dans le salon <#${commandsChannelId}>
      `,
      color: 0x0067ad
    };
  }

  async sticky(targetChannel: Snowflake, embed: APIEmbed) {
    const channel = this.channels.cache.get(targetChannel) as TextChannel;
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (!messages) return;

    const message = messages.find((m) => m.author.id === this.user!.id && m.embeds?.[0]?.title === embed.title);
    const last_message = messages.first();
    if (!message || !last_message || message.id !== last_message.id) {
      if (message) await message.delete();

      return channel.send({ embeds: [embed] });
    }
  }
}

declare module 'discord.js' {
  interface Client {
    dispatcher: Dispatcher;
    stickys: Stickys;
    refreshStatus(): void;
  }
}
