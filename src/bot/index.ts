import {
  ActivityType,
  Client,
  GatewayIntentBits,
  GuildMember,
  GuildTextBasedChannel,
  Interaction,
  InteractionType,
  Message,
  MessageReaction,
  PartialGuildMember,
  PartialMessage,
  PartialMessageReaction,
  Partials,
  PartialUser,
  User
} from 'discord.js';
import Jokes from '../jokes';
import prisma from '../prisma';
import { correctionsChannelId, godfatherRoleId, guildId, suggestionsChannelId } from './constants';
import Dispatcher from './lib/dispatcher';
import { AutoPublish, Summary, Stickys, updateGodfatherEmoji, Votes } from './modules';

export default class Bot extends Client {
  public dispatcher: Dispatcher;
  public stickys: Stickys;
  public summary: Summary;
  public votes: Votes;
  public autoPublish: AutoPublish;

  constructor() {
    super({
      partials: [Partials.Reaction],
      intents:
        GatewayIntentBits.Guilds |
        GatewayIntentBits.GuildMembers |
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.MessageContent |
        GatewayIntentBits.GuildMessageReactions
    });

    this.dispatcher = new Dispatcher(this);
    this.stickys = new Stickys(this);
    this.summary = new Summary(this);
    this.votes = new Votes(this);
    this.autoPublish = new AutoPublish(this);

    this.once('ready', this.onReady.bind(this));
  }

  get available(): boolean {
    return !!this.readyAt;
  }

  async onReady(): Promise<void> {
    console.log(`${this.user!.tag} connecté !`);

    await this.dispatcher.register();
    await this.stickys.reload();

    this.registerEvents();
    this.refreshStatus();
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (interaction.type === InteractionType.ApplicationCommand) {
      return this.dispatcher.executeCommand(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'user_summary') {
        return this.summary.pendingUserDecisions(interaction);
      }

      if (interaction.customId.startsWith('cmd:')) {
        return this.dispatcher.executeCommandButton(interaction);
      }
    }
  }

  async onMessageCreate(message: Message | PartialMessage): Promise<void> {
    if (!message.inGuild()) return;
    if (!(message.channelId in this.stickys.messages)) return;
    if (message.author.id != this.user!.id) {
      message.deletable && (await message.delete());
      return;
    }
    return this.stickys.run(message);
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
        } catch {}
      }
    }
  }

  async onMessageReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    return this.votes.run(reaction, user);
  }

  async onGuildMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    if (newMember.guild.id !== guildId) return;
    if ((oldMember.avatar ?? oldMember.user.avatar) === (newMember.avatar ?? newMember.user.avatar)) return;
    if (!newMember.roles.cache.has(godfatherRoleId)) return;
    await updateGodfatherEmoji(newMember);
  }

  registerEvents(): void {
    this.on('interactionCreate', this.onInteractionCreate.bind(this));
    this.on('messageCreate', this.onMessageCreate.bind(this));
    this.on('messageDelete', this.onMessageDelete.bind(this));
    this.on('messageReactionAdd', this.onMessageReactionAdd.bind(this));
    this.on('guildMemberUpdate', this.onGuildMemberUpdate.bind(this));
  }

  refreshStatus() {
    this.user!.setActivity(`les ${Jokes.count} blagues`, {
      type: ActivityType.Watching
    });
  }

  async start(): Promise<void> {
    if (process.env.BOT_SERVICE !== 'true') {
      return console.log('Bot service désactivé');
    }
    if (!process.env.BOT_TOKEN) {
      return console.log("Bot non lancé car aucun token n'a été défini");
    }

    await this.login(process.env.BOT_TOKEN);
  }
}

declare module 'discord.js' {
  interface Client {
    dispatcher: Dispatcher;
    stickys: Stickys;
    summary: Summary;
    votes: Votes;
    autoPublish: AutoPublish;

    refreshStatus(): void;
  }
}
