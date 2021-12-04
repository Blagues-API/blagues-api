import { Client, CommandInteraction, Intents, Interaction } from 'discord.js';
import Jokes from '../jokes';
import Dispatcher from './lib/dispatcher';
import Stickys from './lib/stickys';

export default class Bot extends Client {
  public dispatcher: Dispatcher;
  public stickys: Stickys;

  constructor() {
    super({
      partials: ['REACTION'],
      intents: Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES
    });

    this.dispatcher = new Dispatcher(this);
    this.stickys = new Stickys(this);

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

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (interaction.type === 'APPLICATION_COMMAND') {
      return this.dispatcher.execute(interaction as CommandInteraction);
    }
  }

  registerEvents(): void {
    this.on('interactionCreate', this.onInteractionCreate.bind(this));
  }

  refreshStatus() {
    this.user!.setActivity(`les ${Jokes.count} blagues`, {
      type: 'WATCHING'
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
}

declare module 'discord.js' {
  interface Client {
    dispatcher: Dispatcher;
    stickys: Stickys;
    refreshStatus(): void;
  }
}
