import { Client, CommandInteraction, Intents, Interaction } from 'discord.js';
import jokes from '../../blagues.json';
// import { AdminUsers, jokeRole, suggestsChannel, logsChannel} from './constents'
import Commands from './commands';
import Validation from './validation'

export default class Bot {
  public client: Client;
  public commands: Commands;
  public validation: Validation;

  constructor() {
    this.client = new Client({
      partials: ['REACTION'],
      intents: Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES
    });

    this.commands = new Commands(this.client);
    this.validation = new Validation(this.client);

    this.client.once('ready', this.onReady.bind(this));
  }

  get available(): boolean {
    return !!this.client.readyAt;
  }

  async onReady(): Promise<void> {
    console.log(`${this.client.user!.tag} connecté !`);

    this.client.user!.setActivity(`les ${jokes.length} blagues`, {
      type: 'WATCHING'
    });
    setInterval(() => {
      this.client.user!.setActivity(`les ${jokes.length} blagues`, {
        type: 'WATCHING'
      });
    }, 24 * 60 * 60 * 1000);

    await this.commands.register();
    await this.validation.register();

    this.registerEvents();
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {

    if(interaction.isContextMenu()){
      return this.validation.execute(interaction as CommandInteraction)
    }

    if (interaction.isCommand()){
      return this.commands.execute(interaction as CommandInteraction);
    }

  }

  registerEvents(): void {
    this.client.on('interactionCreate', this.onInteractionCreate.bind(this));
  }

  async start(): Promise<void> {
    if (process.env.bot_service !== 'true') {
      return console.log('Bot service désactivé');
    }
    if (!process.env.BOT_TOKEN) {
      return console.log("Bot non lancé car aucun token n'a été défini");
    }
    await this.client.login(process.env.BOT_TOKEN);
  }
}
